window.SKIN_DATA = [];

window.SKIN_DATA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQOx6fV8tgiG9IVDIOE3BPNDKEyUpCbd70ROzu8HWTIKIPl_TlXZluTd-jrn5as_15-DZtlINiSNDqJ/pub?gid=0&single=true&output=csv";

window.loadSkinData = async function () {
  const response = await fetch(window.SKIN_DATA_URL);

  if (!response.ok) {
    throw new Error("スキンデータの読み込みに失敗しました");
  }

  const csv = await response.text();
  const rows = parseSkinCSV(csv);

  const headers = rows.shift().map(value => value.trim());

  window.SKIN_DATA = rows
    .filter(row => row.some(value => value.trim() !== ""))
    .map(row => {
      const item = {};

      headers.forEach((header, index) => {
        item[header] = (row[index] || "").trim();
      });

      return item;
    });
};

function parseSkinCSV(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value !== "" || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}
