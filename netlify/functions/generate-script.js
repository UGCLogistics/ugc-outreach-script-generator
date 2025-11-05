// --- Ini adalah Backend Proxy Anda ---
// Kode ini berjalan di server Netlify, BUKAN di browser pengguna.

// URL API Google Gemini
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent`;

// Fungsi handler Netlify
exports.handler = async (event, context) => {
    // 1. Ambil Kunci API Rahasia Anda dari variabel lingkungan Netlify
    // Kunci ini TIDAK PERNAH dilihat oleh pengguna.
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Kunci API Gemini belum diatur di server." }),
        };
    }

    // 2. Ambil data (systemPrompt dan userPrompt) yang dikirim dari HTML
    let body;
    try {
        body = JSON.parse(event.body);
    } catch (e) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Request body tidak valid." }),
        };
    }

    const { systemPrompt, userPrompt } = body;

    if (!systemPrompt || !userPrompt) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "systemPrompt dan userPrompt diperlukan." }),
        };
    }

    // 3. Siapkan payload untuk dikirim ke Google Gemini
    const payload = {
        contents: [{
            parts: [{ text: userPrompt }]
        }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        }
    };

    // 4. Panggil API Gemini dari server
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error dari Gemini:", errorData);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Gagal memanggil API Gemini. Status: ${response.status}` }),
            };
        }

        const result = await response.json();

        // 5. Ekstrak teks dan kirim kembali ke HTML (Frontend)
        if (result.candidates && result.candidates[0].content.parts[0].text) {
            const text = result.candidates[0].content.parts[0].text;
            return {
                statusCode: 200,
                body: JSON.stringify({ text: text }),
            };
        } else {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Respons dari Gemini tidak valid atau diblokir (safety filter)." }),
            };
        }

    } catch (error) {
        console.error("Error internal server:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Terjadi error pada proxy server: ${error.message}` }),
        };
    }
};
