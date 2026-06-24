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

    // 2. BACA BALASAN DARI GAS! (Jangan asal sukses)
    const gasData = await gasRes.json();
    
    // Kalau GAS menolak (misal: "Nomor Internet sudah dilaporkan"), lempar error ke HP!
    if (gasData.status === "error") {
        throw new Error(gasData.message);
    }

    res.status(200).json({ success: true, id: payload.idEvidence });
  } catch (error) {
    console.error(error);
    // Kirim pesan gagal supaya HP memunculkan Alert
    res.status(500).json({ success: false, error: error.message });
  }
}
