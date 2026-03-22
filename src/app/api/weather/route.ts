import { NextResponse } from 'next/server';

export const revalidate = 1800; // cache 30 min

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
        return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
    }

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
        const res = await fetch(url, { next: { revalidate: 1800 } });

        if (!res.ok) {
            throw new Error(`Open-Meteo error: ${res.status}`);
        }

        const data = await res.json();
        const temp = Math.round(data?.current?.temperature_2m ?? null);
        const code = data?.current?.weather_code;

        // Map WMO weather code to a short emoji label
        const condition = wmoToEmoji(code);

        return NextResponse.json({ temp, condition });
    } catch (e) {
        console.error('Weather fetch error:', e);
        return NextResponse.json({ error: 'Weather unavailable' }, { status: 500 });
    }
}

function wmoToEmoji(code: number): string {
    if (code === 0) return '☀️ Clear';
    if (code <= 3) return '⛅ Cloudy';
    if (code <= 49) return '🌫️ Fog';
    if (code <= 67) return '🌧️ Rain';
    if (code <= 77) return '🌨️ Snow';
    if (code <= 82) return '🌦️ Showers';
    if (code <= 99) return '⛈️ Tstorm';
    return '🌡️';
}
