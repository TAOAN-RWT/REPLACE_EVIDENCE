export const config = {
    api: { bodyParser: { sizeLimit: '10mb' } } // Antisipasi ukuran foto besar
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { 
    nik, nama, branch, sa, tanggal, noInet, jenisPekerjaan, jenisTeknisi, keterangan, 
    fotoPekerjaan, fotoPelanggan, fotoBAST 
  } = req.body;

  // 1. Generate ID Evidence Unik
  const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, "");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const idEvidence = `EVD-${dateStr}-${randomStr}`;

  // 2. Susun Caption Baru Sesuai Request
  const caption = `📝 Laporan Replacement !!!\n\n` +
                  `<><><><><><><><><><><><><><><><><>\n\n` +
                  `🆔 <b>ID Evidence:</b> ${idEvidence}\n` +
                  `📡 <b>No Internet:</b> ${noInet}\n` +
                  `👷🏻‍♂️ <b>Nama:</b> ${nama} (${nik})\n` +
                  `🪪 <b>Jenis Pekerjaan:</b> ${jenisPekerjaan}\n` +
                  `🚧 <b>Keterangan:</b> ${keterangan}\n\n` +
                  `<><><><><><><><><><><><><><><><><>\n\n` +
                  `💾 - Tercatat di Spreadsheet`;
  
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const CHANNEL_ID = "-1004426144664";
  const GAS_URL = "https://script.google.com/macros/s/AKfycbxYx2YJaBqqS1HrSYtdUHRLwVHrITDYBrdBT4tVtmQ7IyaAmLRWeySzdE-yTQbKaTg4/exec";

  const allPhotos = [...fotoPekerjaan, fotoPelanggan, fotoBAST];

  try {
    // A. Kirim Foto ke Telegram Channel
    const formData = new FormData();
    formData.append('chat_id', CHANNEL_ID);

    const mediaArray = [];

    for (let i = 0; i < allPhotos.length; i++) {
        const base64Data = allPhotos[i].split(',')[1]; 
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: 'image/jpeg' });
        
        const fieldName = `photo${i}`;
        formData.append(fieldName, blob, `${fieldName}.jpg`);

        const mediaObj = {
            type: 'photo',
            media: `attach://${fieldName}`
        };

        if (i === 0) {
            mediaObj.caption = caption;
            mediaObj.parse_mode = 'HTML';
        }

        mediaArray.push(mediaObj);
    }

    formData.append('media', JSON.stringify(mediaArray));

    // Eksekusi kirim ke Telegram dan tangkap respons-nya
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, {
        method: 'POST',
        body: formData
    });

    let linkEviden = "-";
    if (tgRes.ok) {
        // Ambil Message ID untuk bikin Link Eviden
        const tgData = await tgRes.json();
        const msgId = tgData.result[0].message_id;
        // Format Link Private Channel: hilangkan -100 dari ID
        linkEviden = `https://t.me/c/4426144664/${msgId}`;
    } else {
        const errTg = await tgRes.text();
        console.error("Error Telegram:", errTg);
    }

    // B. Kirim Teks ke Spreadsheet (GAS) termasuk Jenis Teknisi & Link Eviden
    await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            branch, sa, noInet, nama, nik, jenisPekerjaan, jenisTeknisi, idEvidence, keterangan, linkEviden
        })
    });

    res.status(200).json({ success: true, id: idEvidence });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}
