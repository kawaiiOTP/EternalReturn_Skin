const RANKING_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQOx6fV8tgiG9IVDIOE3BPNDKEyUpCbd70ROzu8HWTIKIPl_TlXZluTd-jrn5as_15-DZtlINiSNDqJ/pub?gid=0&single=true&output=csv";

const rankingList = document.getElementById("rankingList");
const rankingSearch = document.getElementById("rankingSearch");
const rankingCount = document.getElementById("rankingCount");
const rankingDate = document.getElementById("rankingDate");
const rankingEmpty = document.getElementById("rankingEmpty");

let skins = [];

// CSVの1行を解析する
function parseRankingCSVLine(line) {
  const result = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }

  result.push(value.trim());
  return result;
}

// CSV全体をオブジェクト配列に変換する
function parseRankingCSV(csv) {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(line => line.trim() !== "");

  if (lines.length < 2) return [];

  const headers = parseRankingCSVLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = parseRankingCSVLine(line);
    const item = {};

    headers.forEach((header, index) => {
      item[header] = values[index] ?? "";
    });

    return item;
  });
}

// 実装日の文字列を日付として解析する
function parseRankingDate(value) {
  if (!value) return null;

  const match = value.trim().match(
    /^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/
  );

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  // 存在しない日付を除外する
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

// キャラクターごとに最新のスキンを取得する
function getRanking() {
  const latestByCharacter = new Map();

  skins.forEach(skin => {
    const character = (skin.character || "").trim();
    const skinName = (skin.skinName || "").trim();
    const releaseDate = (skin.releaseDate || "").trim();

    if (!character || !releaseDate) return;

    const date = parseRankingDate(releaseDate);
    if (!date) return;

    const previous = latestByCharacter.get(character);

    if (!previous || date > previous.date) {
      latestByCharacter.set(character, {
        character,
        skinName,
        releaseDate,
        date
      });
    }
  });

  const today = new Date();
  const todayUTC = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return [...latestByCharacter.values()]
    .map(item => ({
      ...item,
      days: Math.max(
        0,
        Math.floor(
          (todayUTC - item.date.getTime()) / 86400000
        )
      )
    }))
    .sort((a, b) =>
      b.days - a.days ||
      a.character.localeCompare(b.character, "ja")
    );
}

// ランキングを画面に表示する
function renderRanking() {
  const keyword = rankingSearch.value
    .trim()
    .toLocaleLowerCase();

  const ranking = getRanking().filter(item =>
    item.character.toLocaleLowerCase().includes(keyword)
  );

  rankingList.replaceChildren();

  ranking.forEach((item, index) => {
    const row = document.createElement("article");
    row.className = "ranking-item";

    const number = document.createElement("div");
    number.className = "rank-number";
    number.textContent = index + 1;

    const info = document.createElement("div");

    const name = document.createElement("div");
    name.className = "rank-character";
    name.textContent = item.character;

    const detail = document.createElement("div");
    detail.className = "rank-detail";
    detail.textContent =
      `最新スキン：${item.skinName || "名称未登録"} / 実装日：${item.releaseDate}`;

    info.append(name, detail);

    const days = document.createElement("div");
    days.className = "rank-days";

    const strong = document.createElement("strong");
    strong.textContent = item.days.toLocaleString("ja-JP");

    const label = document.createElement("span");
    label.textContent = "日経過";

    days.append(strong, label);
    row.append(number, info, days);
    rankingList.appendChild(row);
  });

  rankingCount.textContent = `${ranking.length}キャラクター`;
  rankingDate.textContent =
    `集計日：${new Date().toLocaleDateString("ja-JP")}`;

  rankingEmpty.hidden = ranking.length !== 0;
}

// CSVを読み込む
async function loadRankingData() {
  rankingList.replaceChildren();

  const loading = document.createElement("p");
  loading.textContent = "ランキングを読み込み中…";
  rankingList.appendChild(loading);

  try {
    const response = await fetch(RANKING_CSV_URL, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`CSVの取得に失敗しました：${response.status}`);
    }

    const csv = await response.text();
    skins = parseRankingCSV(csv);

    if (skins.length === 0) {
      throw new Error("CSVにスキンデータがありません。");
    }

    renderRanking();
  } catch (error) {
    console.error("ランキングの読み込みエラー:", error);

    rankingList.replaceChildren();

    const message = document.createElement("p");
    message.textContent =
      "ランキングを読み込めませんでした。スプレッドシートの公開設定と列名を確認してください。";

    rankingList.appendChild(message);
    rankingCount.textContent = "読み込み失敗";
    rankingDate.textContent = "";
    rankingEmpty.hidden = true;
  }
}

// 検索するたびにランキングを更新
rankingSearch.addEventListener("input", renderRanking);

// 初回読み込み
loadRankingData();
