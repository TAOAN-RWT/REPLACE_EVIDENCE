export const config = {
    api: { bodyParser: { sizeLimit: '10mb' } } // Antisipasi ukuran foto besar
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { 
    nik, nama, branch, sa, tanggal, noInet, jenisPekerjaan, keterangan, 
    fotoPekerjaan, fotoPelanggan, fotoBAST 
  } = req.body;

  // 1. Generate ID Evidence Unik (Contoh: EVD-20260624-XXXX)
  const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, "");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const idEvidence = `EVD-${dateStr}-${randomStr}`;

  // 2. Susun Caption untuk di Channel
  const caption = `<b>Laporan Baru!</b>\n\n` +
                  `<b>ID Evidence:</b> ${idEvidence}\n` +
                  `<b>No Internet:</b> ${noInet}\n` +
                  `<b>Nama:</b> ${nama} (${nik})\n` +
                  `<b>Jenis Pekerjaan:</b> ${jenisPekerjaan}\n` +
                  `<b>Keterangan:</b> ${keterangan}`;
  
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const CHANNEL_ID = "-1004426144664";
  const GAS_URL = "https://script.google.com/macros/s/AKfycbxYx2YJaBqqS1HrSYtdUHRLwVHrITDYBrdBT4tVtmQ7IyaAmLRWeySzdE-yTQbKaTg4/exec";

  // Kumpulkan semua base64 file dalam 1 array
  const allPhotos = [...fotoPekerjaan, fotoPelanggan, fotoBAST];

  try {
    // A. Kirim Foto ke Telegram Channel (Sebagai Album / MediaGroup)
    const formData = new FormData();
    formData.append('chat_id', CHANNEL_ID);

    const mediaArray = [];

    for (let i = 0; i < allPhotos.length; i++) {
        // Hapus header base64 (data:image/jpeg;base64,)
        const base64Data = allPhotos[i].split(',')[1]; 
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: 'image/jpeg' });
        
        const fieldName = `photo${i}`;
        // Masukkan file fisik ke dalam FormData
        formData.append(fieldName, blob, `${fieldName}.jpg`);

        // Buat objek untuk array media
        const mediaObj = {
            type: 'photo',
            media: `attach://${fieldName}`
        };

        // Tambahkan caption HANYA pada foto pertama
        if (i === 0) {
            mediaObj.caption = caption;
            mediaObj.parse_mode = 'HTML';
        }

        mediaArray.push(mediaObj);
    }

    // Masukkan array media (berupa JSON string) ke FormData
    formData.append('media', JSON.stringify(mediaArray));

    // Eksekusi kirim ke Telegram
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, {
        method: 'POST',
        body: formData
    });

    if (!tgRes.ok) {
        const errTg = await tgRes.text();
        console.error("Error Telegram:", errTg);
    }

    // B. Kirim Teks ke Spreadsheet (GAS)
    await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            branch, sa, noInet, nama, nik, jenisPekerjaan, idEvidence, keterangan
        })
    });

    res.status(200).json({ success: true, id: idEvidence });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}
