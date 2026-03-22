import { NextResponse } from 'next/server';

export const revalidate = 1800; // cache 30 min

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const date = searchParams.get('date');   // YYYY-MM-DD — event start date
    const hour = searchParams.get('hour');   // 0-23 — UTC hour for round start

    if (!lat || !lon) {
        return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
    }

    try {
        // ── Current weather ──────────────────────────────────────────────────
        const currentUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
        const res = await fetch(currentUrl, { next: { revalidate: 1800 } });
        if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
        const data = await res.json();

        const temp = Math.round(data?.current?.temperature_2m ?? 0);
        const windSpeed = Math.round(data?.current?.wind_speed_10m ?? 0);
        const condition = wmoToEmoji(data?.current?.weather_code);

        // ── Hourly forecast for tournament day ──────────────────────────────
        let forecast: { temp: number; condition: string; windSpeed: number } | null = null;

        if (date && hour !== null) {
            const targetHour = parseInt(hour, 10);
            // Open-Meteo hourly forecast is available up to ~16 days ahead
            const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=UTC&start_date=${date}&end_date=${date}`;
            const fRes = await fetch(forecastUrl, { next: { revalidate: 3600 } });

            if (fRes.ok) {
                const fd = await fRes.json();
                const times: string[] = fd?.hourly?.time ?? [];
                const idx = times.findIndex(t => t.endsWith(`T${String(targetHour).padStart(2, '0')}:00`));
                if (idx !== -1) {
                    forecast = {
                        temp: Math.round(fd.hourly.temperature_2m[idx] ?? 0),
                        windSpeed: Math.round(fd.hourly.wind_speed_10m[idx] ?? 0),
                        condition: wmoToEmoji(fd.hourly.weather_code[idx]),
                    };
                }
            }
        }

        return NextResponse.json({ temp, condition, windSpeed, forecast });
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
