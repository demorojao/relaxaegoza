import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabaseServer';
import { MediaConvertClient, DescribeEndpointsCommand, CreateJobCommand } from '@aws-sdk/client-mediaconvert';

export async function POST(req: NextRequest) {
  try {
    // 1. Validar a sessão do usuário de forma segura
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const supabaseServer = getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    // 2. Extrair dados da requisição
    const { videoUrl, photoId, tableType } = await req.json(); // tableType: 'profile_photos' | 'stories'
    if (!videoUrl) {
      return NextResponse.json({ error: 'URL do vídeo é obrigatória.' }, { status: 400 });
    }

    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsRegion = process.env.AWS_REGION || 'us-east-2';
    const mediaConvertRoleArn = process.env.AWS_MEDIACONVERT_ROLE_ARN;

    // Se as credenciais da AWS ou a Role do MediaConvert não estiverem configuradas,
    // apenas ignora a compactação silenciosamente em ambiente de desenvolvimento
    if (!awsAccessKey || !awsSecretKey || !mediaConvertRoleArn) {
      console.log('MediaConvert is not configured. Skipping transcoding and keeping original video.');
      return NextResponse.json({
        success: true,
        transcoded: false,
        message: 'MediaConvert não configurado. Mantendo o vídeo original.',
        url: videoUrl
      });
    }

    // 3. Inicializar cliente temporário para buscar o endpoint customizado da conta
    const tempClient = new MediaConvertClient({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey
      }
    });

    let customEndpoint: string;
    try {
      const endpointsResponse = await tempClient.send(new DescribeEndpointsCommand({}));
      customEndpoint = endpointsResponse.Endpoints?.[0]?.Url || '';
      if (!customEndpoint) throw new Error('Nenhum endpoint encontrado.');
    } catch (endpointErr) {
      console.error('Error fetching MediaConvert custom endpoint:', endpointErr);
      return NextResponse.json({ error: 'Erro ao conectar com o serviço de transcodificação da AWS.' }, { status: 500 });
    }

    // 4. Inicializar cliente no endpoint correto
    const mediaConvert = new MediaConvertClient({
      endpoint: customEndpoint,
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey
      }
    });

    // 5. Configurar o Job do MediaConvert
    // Definimos a saída para o mesmo diretório, adicionando o sufixo "_optimized"
    // Nota: O input é a URL HTTP pública do Supabase Storage. A saída vai para o bucket S3 associado.
    const fileExtension = videoUrl.split('.').pop() || 'mp4';
    const baseVideoUrl = videoUrl.slice(0, -(fileExtension.length + 1));
    const transcodedUrl = `${baseVideoUrl}_optimized.mp4`;

    // Mapeia URL pública para o bucket S3 (Exemplo padrão)
    // S3 bucket da Supabase: s3://[project-ref]/profile_media
    const projectRef = 'ivlaeilkomqhqwerojny';
    const s3Destination = `s3://${projectRef}/profile_media/${user.id}/`;

    const jobSettings = {
      Role: mediaConvertRoleArn,
      Settings: {
        TimecodeConfig: { Source: 'ZEROBASED' as const },
        Inputs: [
          {
            FileInput: videoUrl,
            AudioSelectors: {
              'Audio Selector 1': { DefaultSelection: 'DEFAULT' as const }
            },
            VideoSelector: {}
          }
        ],
        OutputGroups: [
          {
            Name: 'File Group' as const,
            OutputGroupSettings: {
              Type: 'FILE_GROUP_SETTINGS' as const,
              FileGroupSettings: {
                Destination: s3Destination
              }
            },
            Outputs: [
              {
                VideoDescription: {
                  CodecSettings: {
                    Codec: 'H_264' as const,
                    H264Settings: {
                      RateControlMode: 'QVBR' as const,
                      QvbrSettings: { MaxAverageBitrate: 1500000 }, // Bitrate econômico ~1.5 Mbps
                      MaxBitrate: 2500000,
                      SceneChangeDetect: 'ENABLED' as const,
                      GopSize: 90,
                      GopBReference: 'ENABLED' as const,
                      NumberBFramesBetweenReferenceFrames: 3,
                      NumberReferenceFrames: 3,
                      Syntax: 'DEFAULT' as const,
                      Profile: 'MAIN' as const,
                      Level: 'AUTO' as const
                    }
                  },
                  Width: 720,
                  Height: 1280, // Formato vertical para Reels/Stories
                  ScalingBehavior: 'DEFAULT' as const,
                  AntiAlias: 'ENABLED' as const,
                  Sharpness: 50
                },
                AudioDescriptions: [
                  {
                    CodecSettings: {
                      Codec: 'AAC' as const,
                      AacSettings: {
                        AudioPackingMode: 'SINGLE_MONO_TO_STEREO' as const,
                        Bitrate: 96000,
                        CodingMode: 'CODING_MODE_2_0' as const,
                        SampleRate: 48000
                      }
                    }
                  }
                ],
                ContainerSettings: {
                  Container: 'MP4' as const,
                  Mp4Settings: {}
                },
                NameModifier: '_optimized'
              }
            ]
          }
        ]
      }
    };

    try {
      const command = new CreateJobCommand(jobSettings);
      const response = await mediaConvert.send(command);
      console.log('MediaConvert job created successfully:', response.Job?.Id);

      // 6. Atualizar a URL no banco de dados para a URL otimizada
      const supabaseService = getSupabaseServiceClient();
      
      if (tableType === 'stories' && photoId) {
        await supabaseService
          .from('stories')
          .update({ media_url: transcodedUrl })
          .eq('id', photoId);
      } else if (photoId) {
        await supabaseService
          .from('profile_photos')
          .update({ photo_url: transcodedUrl })
          .eq('id', photoId);
      }

      return NextResponse.json({
        success: true,
        transcoded: true,
        jobId: response.Job?.Id,
        url: transcodedUrl
      });

    } catch (jobErr: any) {
      console.error('Error creating MediaConvert job:', jobErr);
      return NextResponse.json({
        success: true,
        transcoded: false,
        message: 'Falha ao processar job da AWS. Mantendo o vídeo original.',
        error: jobErr.message,
        url: videoUrl
      });
    }

  } catch (err: any) {
    console.error('API Media Transcode Error:', err);
    return NextResponse.json({ error: err.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
