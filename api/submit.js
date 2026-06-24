export const config = {
    api: { bodyParser: { sizeLimit: '10mb' } } 
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const payload = req.body;

  // 1. Generate ID Evidence Unik
  const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, "");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  payload.idEvidence = `EVD-${dateStr}-${randomStr}`;

  // URL GAS Kamu
  const GAS_URL = "https://script.google.com/macros/s/AKfycbxYx2YJaBqqS1HrSYtdUHRLwVHrITDYBrdBT4tVtmQ7IyaAmLRWeySzdE-yTQbKaTg4/exec";

  try {
    const gasRes = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    // 2. BACA BALASAN DARI GAS!
    const gasData = await gasRes.json();
    
    // Kalau GAS menolak (misal: "Nomor Internet sudah dilaporkan")
    // Langsung kembalikan pesan itu ke HP secara halus (Status 200), jangan pakai throw Error
    if (gasData.status === "error") {
        return res.status(200).json({ success: false, error: gasData.message });
    }

    // Kalau sukses, kembalikan status sukses
    res.status(200).json({ success: true, id: payload.idEvidence });
    
  } catch (error) {
    console.error(error);
    // Ini baru error beneran kalau server mati atau koneksi putus
    res.status(500).json({ success: false, error: "Gagal menghubungi server database." });
  }
}
