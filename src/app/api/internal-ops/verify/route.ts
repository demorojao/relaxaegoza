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

    const { profileId, status, isSpace, roomId, isRoom, isPhoto, photoId, isProfileUpdate, updateFields } = await req.json();

    if (!isRoom && !isPhoto && !profileId) {
      return NextResponse.json({ error: 'ID de perfil inválido.' }, { status: 400 });
    }

    if (isRoom) {
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
