import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    // 1. Validar a assinatura de chave de acesso do cabeçalho para conter ataques direct api calls
    const adminSecret = req.headers.get('x-admin-secret');
    const expectedSecret = process.env.ADMIN_ACCESS_SECRET || 'aura-master-secure-2026';

    if (!adminSecret || adminSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Acesso Proibido. Token de assinatura inválido.' }, { status: 403 });
    }

    // 2. Validar a sessão do usuário
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado. Faça login novamente.' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const supabaseServer = getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    // Instancia o cliente administrativo (service_role) para validar a role do admin ignorando RLS
    const supabaseService = getSupabaseServiceClient();

    // 3. Confirmar se o usuário que faz a chamada é de fato um 'admin' no banco
    const { data: adminProfile, error: adminProfileError } = await supabaseService
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminProfileError || !adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem executar esta ação.' }, { status: 403 });
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

    const { 
      profileId, 
      status, 
      isSpace, 
      roomId, 
      isRoom, 
      isPhoto, 
      photoId, 
      isProfileUpdate, 
      updateFields,
      isBan,
      isUnban,
      ipAddress,
      reason,
      isReportsList,
      isReportDismiss,
      isReportPunish,
      reportId,
      isBoostGrant,
      boostHours
    } = await req.json();

    // Se for listagem simples de denúncias, não exige PIN de segurança
    if (isReportsList) {
      const { data: reports, error: reportsError } = await supabaseService
        .from('reports')
        .select(`
          id,
          reason,
          description,
          status,
          created_at,
          reporter:profiles!reports_reporter_id_fkey(id, name),
          reported:profiles!reports_reported_profile_id_fkey(id, name, last_ip)
        `)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;
      return NextResponse.json({ success: true, reports });
    }

    // Ações de alteração/mutação exigem validação do PIN de Segurança Admin
    const requiresPin = isProfileUpdate || isBan || isReportPunish || isBoostGrant || (isProfileUpdate && updateFields?.subscription_tier);
    if (requiresPin) {
      const adminPin = req.headers.get('x-admin-pin');
      const expectedPin = process.env.ADMIN_SECURITY_PIN || '9847';
      if (!adminPin || adminPin !== expectedPin) {
        return NextResponse.json({ error: 'PIN de Segurança Inválido ou não fornecido.' }, { status: 403 });
      }
    }

    // Concessão Manual de Boost pelo Admin
    if (isBoostGrant) {
      if (!profileId || !boostHours) {
        return NextResponse.json({ error: 'Perfil de destino ou quantidade de horas inválida.' }, { status: 400 });
      }

      const { data: targetProfile } = await supabaseService
        .from('profiles')
        .select('boost_expires_at')
        .eq('id', profileId)
        .single();

      const currentBoostExpires = targetProfile?.boost_expires_at
        ? new Date(targetProfile.boost_expires_at)
        : new Date();

      const baseDate = currentBoostExpires > new Date() ? currentBoostExpires : new Date();
      const newExpires = new Date(baseDate.getTime() + boostHours * 60 * 60 * 1000);

      const { error: boostError } = await supabaseService
        .from('profiles')
        .update({ 
          boost_expires_at: newExpires.toISOString(),
          is_available_now: true
        })
        .eq('id', profileId);

      if (boostError) throw boostError;

      // Log de Auditoria
      try {
        await supabaseService.from('admin_audit_logs').insert({
          admin_id: user.id,
          action: 'BOOST_GRANT',
          target_profile_id: profileId,
          details: { boostHours, newExpires: newExpires.toISOString() },
          ip_address: clientIp
        });
      } catch (err) {
        console.warn('Erro ao salvar audit log:', err);
      }

      return NextResponse.json({ success: true, boost_expires_at: newExpires.toISOString() });
    }

    if (isReportDismiss) {
      if (!reportId) {
        return NextResponse.json({ error: 'ID de denúncia inválido.' }, { status: 400 });
      }
      const { error: updateError } = await supabaseService
        .from('reports')
        .update({ status: 'dismissed' })
        .eq('id', reportId);

      if (updateError) throw updateError;
      return NextResponse.json({ success: true });
    }

    if (isReportPunish) {
      if (!reportId || !profileId) {
        return NextResponse.json({ error: 'ID de denúncia ou de perfil inválido.' }, { status: 400 });
      }
      const { error: updateReportError } = await supabaseService
        .from('reports')
        .update({ status: 'resolved' })
        .eq('id', reportId);
      if (updateReportError) throw updateReportError;

      const { data: reportedProfile, error: getProfileError } = await supabaseService
        .from('profiles')
        .update({ verification_status: 'rejected' })
        .eq('id', profileId)
        .select('last_ip')
        .single();
      if (getProfileError) throw getProfileError;

      await supabaseService
        .from('ads')
        .update({ is_active: false })
        .eq('profile_id', profileId);

      if (reportedProfile?.last_ip) {
        await supabaseService
          .from('ip_bans')
          .upsert({ 
            ip_address: reportedProfile.last_ip, 
            reason: reason || 'Denúncia apurada e confirmada pela moderação.' 
          }, { onConflict: 'ip_address' });
      }

      // Log de Auditoria
      try {
        await supabaseService.from('admin_audit_logs').insert({
          admin_id: user.id,
          action: 'REPORT_PUNISH',
          target_profile_id: profileId,
          details: { reportId, reason },
          ip_address: clientIp
        });
      } catch (err) {
        console.warn('Erro ao salvar audit log:', err);
      }

      return NextResponse.json({ success: true });
    }

    if (!isRoom && !isPhoto && !isBan && !isUnban && !profileId) {
      return NextResponse.json({ error: 'ID de perfil inválido.' }, { status: 400 });
    }

    if (isBan) {
      if (!ipAddress) {
        return NextResponse.json({ error: 'Endereço IP inválido.' }, { status: 400 });
      }
      const { error: banError } = await supabaseService
        .from('ip_bans')
        .insert({ ip_address: ipAddress, reason: reason || 'Violação dos termos de uso' });

      if (banError) throw banError;

      // Log de Auditoria
      try {
        await supabaseService.from('admin_audit_logs').insert({
          admin_id: user.id,
          action: 'IP_BAN',
          details: { ipAddress, reason },
          ip_address: clientIp
        });
      } catch (err) {
        console.warn('Erro ao salvar audit log:', err);
      }

    } else if (isUnban) {
      if (!ipAddress) {
        return NextResponse.json({ error: 'Endereço IP inválido.' }, { status: 400 });
      }
      const { error: unbanError } = await supabaseService
        .from('ip_bans')
        .delete()
        .eq('ip_address', ipAddress);

      if (unbanError) throw unbanError;
    } else if (isRoom) {
      // Moderação de Salas
      if (!roomId) {
        return NextResponse.json({ error: 'ID de sala inválido.' }, { status: 400 });
      }
      const isVerified = status === 'verified';
      
      const { error: updateError } = await supabaseService
        .from('rooms')
        .update({ is_verified: isVerified })
        .eq('id', roomId);

      if (updateError) throw updateError;
    } else if (isPhoto) {
      // Moderação de Fotos da Galeria
      if (!photoId) {
        return NextResponse.json({ error: 'ID de foto inválido.' }, { status: 400 });
      }

      if (status === 'rejected') {
        const { error: deleteError } = await supabaseService
          .from('profile_photos')
          .delete()
          .eq('id', photoId);

        if (deleteError) throw deleteError;
      } else {
        const { error: updateError } = await supabaseService
          .from('profile_photos')
          .update({ is_verified: true })
          .eq('id', photoId);

        if (updateError) throw updateError;
      }
    } else if (isProfileUpdate) {
      // Atualização Administrativa Direta de Perfil
      if (!updateFields) {
        return NextResponse.json({ error: 'Campos de atualização inválidos.' }, { status: 400 });
      }

      const { error: updateError } = await supabaseService
        .from('profiles')
        .update(updateFields)
        .eq('id', profileId);

      if (updateError) throw updateError;

      // Log de Auditoria
      try {
        await supabaseService.from('admin_audit_logs').insert({
          admin_id: user.id,
          action: 'PROFILE_UPDATE',
          target_profile_id: profileId,
          details: updateFields,
          ip_address: clientIp
        });
      } catch (err) {
        console.warn('Erro ao salvar audit log:', err);
      }
    } else if (isSpace) {
      // Moderação de Selo de Ambiente/Espaço Validado
      const isVerified = status === 'verified';
      const updateData: any = { is_space_verified: isVerified };
      if (status === 'rejected') {
        updateData.space_verification_file = null;
      }
      const { error: updateError } = await supabaseService
        .from('profiles')
        .update(updateData)
        .eq('id', profileId);

      if (updateError) throw updateError;
    } else {
      // Moderação de Selo de Perfil Verificado (Foto/Selfie)
      if (!['verified', 'rejected', 'none'].includes(status)) {
        return NextResponse.json({ error: 'Status de verificação inválido.' }, { status: 400 });
      }

      const { error: updateError } = await supabaseService
        .from('profiles')
        .update({ verification_status: status })
        .eq('id', profileId);

      if (updateError) throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Erro na moderação:', err);
    return NextResponse.json({ error: err.message || 'Erro ao atualizar dados de verificação.' }, { status: 500 });
  }
}
