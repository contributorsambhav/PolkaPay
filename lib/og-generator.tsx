import { ImageResponse } from 'next/og';

export const ogSize = { width: 1200, height: 630 } as const;

async function loadGoogleFont(font: string, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/);
  if (resource) {
    const response = await fetch(resource[1]);
    if (response.status === 200) {
      return await response.arrayBuffer();
    }
  }
  throw new Error(`Failed to load font data for ${font}`);
}

// Adapted from the reference OG generator, but aligned with PolkaPay's light theme.
// Uses Instrument Serif for the main title (loaded from Google Fonts).
export async function generateOgImage(title: string, description: string, path: string) {
  const borderColor = '#e5e5e5';

  const instrumentSerifFont = await loadGoogleFont(
    'Instrument+Serif',
    title + description + 'PolkaPay',
  );

  return new ImageResponse(
    (
      <div
        tw="flex flex-col justify-between w-full h-full p-[72px] relative overflow-hidden"
        style={{
          backgroundColor: '#f9fafb',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, \"SF Pro Text\", sans-serif',
          color: '#020617',
        }}
      >
        {/* Framing lines */}
        <div tw="absolute top-0 bottom-0 left-[40px] border-l border-dashed" style={{ borderColor }} />
        <div tw="absolute top-0 bottom-0 left-[48px] border-l border-dashed" style={{ borderColor }} />
        <div tw="absolute top-0 bottom-0 right-[40px] border-r border-dashed" style={{ borderColor }} />
        <div tw="absolute top-0 bottom-0 right-[48px] border-r border-dashed" style={{ borderColor }} />

        <div tw="absolute left-0 right-0 top-[40px] border-t border-dashed" style={{ borderColor }} />
        <div tw="absolute left-0 right-0 top-[48px] border-t border-dashed" style={{ borderColor }} />
        <div tw="absolute left-0 right-0 bottom-[40px] border-b border-dashed" style={{ borderColor }} />
        <div tw="absolute left-0 right-0 bottom-[48px] border-b border-dashed" style={{ borderColor }} />

        <div tw="flex flex-col">
          <div tw="flex mb-8">
            <div tw="h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#eef2ff' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#4f46e5">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
            </div>
          </div>

          <h1
            tw="text-[72px] m-0 leading-tight"
            style={{
              letterSpacing: '-0.035em',
              fontWeight: 700,
              fontFamily: 'Instrument Serif',
            }}
          >
            {title}
          </h1>
          <p
            tw="text-[26px] mt-8 m-0 leading-relaxed max-w-[960px] font-normal"
            style={{ color: '#4b5563' }}
          >
            {description}
          </p>
        </div>

        <div tw="flex justify-between items-end w-full">
          <div tw="flex flex-col">
            <span tw="text-[24px] font-semibold" style={{ color: '#111827' }}>
              PolkaPay
            </span>
            <span tw="text-[18px] mt-1 font-normal" style={{ color: '#6b7280' }}>
              KYC-enabled remittance console on Polkadot Hub
            </span>
          </div>
          <span tw="text-[16px] font-normal" style={{ color: '#9ca3af' }}>
            polka-pay.vercel.app{path}
          </span>
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        {
          name: 'Instrument Serif',
          data: instrumentSerifFont,
          style: 'normal',
        },
      ],
    },
  );
}

