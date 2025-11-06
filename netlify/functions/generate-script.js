// Ini adalah "backend" Anda yang berjalan di server Netlify.
// Tugasnya adalah menerima permintaan dari index.html,
// secara rahasia menambahkan Kunci API Anda,
// dan memanggil Google Gemini API.

exports.handler = async (event) => {
    // 1. Keamanan: Hanya izinkan metode POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    // 2. Ambil Kunci API Rahasia dari pengaturan Netlify
    // Ini adalah bagian terpenting. Kunci API tidak pernah terekspos ke browser.
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API Key tidak ditemukan di server.' }),
        };
    }

    // 3. Ambil data input dari frontend
    const { inputs } = JSON.parse(event.body);

    // 4. Buat System Prompt (Instruksi untuk AI)
    // Ini adalah "otak" dari generator Anda.
    const systemPrompt = `
Anda adalah asisten AI yang ahli dalam copywriting untuk outreach B2B, spesialisasi di industri logistik dan kargo (PT Utama Globalindo Cargo).
Tugas Anda adalah membuat skrip outreach yang profesional, to the point, dan persuasif berdasarkan parameter yang diberikan.

Parameter yang Diberikan:
1.  Platform: ${inputs.platform}
2.  Bahasa Target: ${inputs.bahasa}
3.  Gaya Bahasa: ${inputs.gaya_bahasa}
4.  Status Prospek: ${inputs.status_prospek}
5.  Tujuan Outreach: ${inputs.tujuan_outreach}
6.  Layanan yang Ditawarkan: ${inputs.layanan}
7.  Pain Point Customer: ${inputs.pain_point}
8.  Nama Perusahaan Customer: ${inputs.nama_perusahaan_customer}
9.  Nama PIC Customer: ${inputs.nama_pic}
10. Nama Sales: ${inputs.nama_sales}
11. Jabatan Sales: ${inputs.jabatan_sales}
12. Info Perusahaan Sales: {
      Nama: ${inputs.nama_perusahaan_sales},
      Web: ${inputs.web_perusahaan},
      Telp: ${inputs.telp_perusahaan},
      Alamat: ${inputs.alamat_perusahaan},
      Email Sales: ${inputs.email_sales},
      HP Sales: ${inputs.hp_sales}
    }

ATURAN KETAT UNTUK OUTPUT:

1.  **Struktur (WAJIB):**
    * Jika Platform adalah 'Email', output HARUS dimulai dengan baris `Subjek: [Tulis Subjek Email di Sini]`.
    * Jika Platform adalah 'WhatsApp', JANGAN gunakan baris Subjek.
    * Selalu gunakan sapaan yang sesuai (misal: "Yth. ${inputs.nama_pic}").
    * Buat isi pesan yang relevan dengan tujuan dan pain point.
    * Tutup dengan Call to Action (CTA) yang jelas.
    * Buat signature (tanda tangan) yang sesuai:
        * Untuk Email: Buat signature lengkap (Nama, Jabatan, Perusahaan, HP, Email, Web).
        * Untuk WhatsApp: Buat signature singkat (Nama, Jabatan, Perusahaan).

2.  **Bahasa dan Format (WAJIB):**
    * Hasilkan skrip HANYA dalam Bahasa Target (${inputs.bahasa}).
    * JANGAN gunakan formatting bold (**), italic (*), atau underline (_). Hasilkan HANYA sebagai plain text.
    * JANGAN gunakan em dash (—). Gunakan tanda hubung biasa (-) jika perlu.
    * Gunakan gaya bahasa yang diminta: ${inputs.gaya_bahasa}.

3.  **Aturan Multi-Bahasa (PENTING):**
    * Jika Bahasa Target (${inputs.bahasa}) BUKAN 'id' (Bahasa Indonesia):
    * Anda HARUS menghasilkan skrip dalam bahasa target (${inputs.bahasa}) terlebih dahulu.
    * Setelah skrip bahasa target selesai, tambahkan separator unik: `[---SEPARATOR_BAHASA---]`
    * Setelah separator, tambahkan terjemahan lengkap skrip tersebut dalam Bahasa Indonesia (termasuk Subjek jika ada).
    * Contoh (jika target 'en'):
        Subjek: [English Subject]
        [English Body]
        [English Signature]
        [---SEPARATOR_BAHASA---]
        Subjek: [Indonesian Subject]
        [Indonesian Body]
        [Indonesian Signature]
    * Jika Bahasa Target adalah 'id', JANGAN tambahkan separator atau terjemahan.

4.  **Konten:** Fokus pada solusi yang ditawarkan ${inputs.nama_perusahaan_sales} untuk ${inputs.pain_point} melalui ${inputs.layanan}. Buat agar relevan dan tidak terkesan spam.

Buat skrip SEKARANG.
`;

    // 5. Buat payload untuk Google Gemini API
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
        contents: [
            {
                role: "user",
                parts: [{ text: systemPrompt }]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
        },
    };

    // 6. Panggil API Google
    try {
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!apiResponse.ok) {
            // Jika Google API mengembalikan error
            const errorText = await apiResponse.text();
            console.error('Google API Error:', errorText);
            return {
                statusCode: apiResponse.status,
                body: JSON.stringify({ error: `Google API Error: ${errorText}` }),
            };
        }

        const data = await apiResponse.json();

        // Ekstrak teks skrip dari respons
        const scriptText = data.candidates[0].content.parts[0].text;

        // 7. Kembalikan hasil ke frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ script: scriptText.trim() }),
        };

    } catch (error) {
        console.error('Server-side Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Kesalahan internal server: ${error.message}` }),
        };
    }
};
