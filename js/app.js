
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQOx6fV8tgiG9IVDIOE3BPNDKEyUpCbd70ROzu8HWTIKIPl_TlXZluTd-jrn5as_15-DZtlINiSNDqJ/pub?gid=0&single=true&output=csv";

let skins = [];
let filteredSkins = [];
let displayedCount = 0;
const PAGE_SIZE = 50;
const loadAllButton = document.getElementById("loadAllButton");


const grid = document.getElementById("skinGrid");
const search = document.getElementById("search");
const characterFilter = document.getElementById("characterFilter");
const seriesFilter = document.getElementById("seriesFilter");
const categoryFilter = document.getElementById("categoryFilter");
const sort = document.getElementById("sort");
const resultCount = document.getElementById("resultCount");
const emptyMessage = document.getElementById("emptyMessage");

// CSVを読み込んで配列に変換する
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  text = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if (
      (char === "\n" || char === "\r") &&
      !quoted
    ) {
      if (char === "\r" && next === "\n") i++;

      row.push(cell);

      if (row.some(value => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);

    if (row.some(value => value.trim() !== "")) {
      rows.push(row);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(value => value.trim());

  return rows.slice(1).map(values => {
    const item = {};

    headers.forEach((header, index) => {
      item[header] = (values[index] || "").trim();
    });

    return item;
  });
}

// 実装日を並べ替え用の数値に変換
// 対応例：2026-10-13、2026/10/13、2026.10.13、2026年10月13日
function parseDate(value) {
  if (!value) return null;

  const match = String(value).trim().match(
    /^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/
  );

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.getTime();
}

// セレクトボックス用の重複しないリスト
const unique = values =>
  [...new Set(values.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ja"));

// セレクトボックスに選択肢を追加
function populateSelect(select, values) {
  if (!select) return;

  select.replaceChildren();

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "すべて";
  select.appendChild(defaultOption);

  unique(values).forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

// タグを作る：レア度・分類ごとにクラスを設定
function createTag(text, type = "") {
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = text || "未分類";

  if (type === "rarity") {
    if (text === "高級") {
      tag.classList.add("tag-rarity-high");
    } else if (text === "レア") {
      tag.classList.add("tag-rarity-rare");
    } else if (text === "英雄") {
      tag.classList.add("tag-rarity-hero");
    }
  }

  if (type === "category") {
    tag.classList.add("tag-category");
  }

  return tag;
}

// スキンカードを作る
function createCard(skin) {
  const card = document.createElement("article");
  card.className = "skin-card";

  const imageArea = document.createElement("div");
  imageArea.className = "skin-image";

  if (skin.thumb) {
    const img = document.createElement("img");
    img.src = skin.thumb;
    img.alt = skin.skinName || "スキン画像";
    img.loading = "lazy";

    img.addEventListener("error", () => {
      imageArea.classList.remove("has-image", "clickable");
      imageArea.replaceChildren();
      imageArea.textContent = "画像準備中";
    });

    imageArea.classList.add("has-image");
    imageArea.appendChild(img);

    if (skin.full) {
      imageArea.classList.add("clickable");
      imageArea.setAttribute("role", "button");
      imageArea.setAttribute("tabindex", "0");
      imageArea.setAttribute("aria-label", "画像を拡大");

      const openImage = () => {
        const dialog = document.getElementById("imageDialog");
        const fullImage = document.getElementById("fullImage");
        const caption = document.getElementById("dialogCaption");

        if (!dialog || !fullImage || !caption) return;

        fullImage.src = skin.full;
        fullImage.alt = skin.skinName || "スキン画像";
        caption.textContent =
          `${skin.character || ""} / ${skin.skinName || ""}`;

        if (!dialog.open) dialog.showModal();
      };

      imageArea.addEventListener("click", openImage);

      imageArea.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openImage();
        }
      });
    }
  } else {
    imageArea.textContent = "画像準備中";
  }

  const info = document.createElement("div");
  info.className = "skin-info";

  const title = document.createElement("h2");
  title.className = "skin-name";
  title.textContent = skin.skinName || "名称未登録";

  const character = document.createElement("div");
  character.className = "skin-character";
  character.textContent = skin.character || "キャラクター未登録";

  const tags = document.createElement("div");
  tags.className = "tags";

  // シリーズ：既存のタグ色
  if (skin.series) {
    tags.appendChild(createTag(skin.series));
  }

  // レア度：高級・レア・英雄で色分け
  if (skin.rarity) {
    tags.appendChild(createTag(skin.rarity, "rarity"));
  }

  // 分類：常に薄灰色
  if (skin.category) {
    tags.appendChild(createTag(skin.category, "category"));
  }

  const date = document.createElement("div");
  date.className = "skin-date";
  date.textContent = skin.releaseDate
    ? `実装日：${skin.releaseDate}`
    : "実装日：未登録";

  info.append(title, character, tags, date);
  card.append(imageArea, info);

  return card;
}


/* 次の50件を表示 */
function loadNextBatch() {
  if (!grid) return;

  const nextCount = Math.min(
    displayedCount + PAGE_SIZE,
    filteredSkins.length
  );

  const fragment = document.createDocumentFragment();

  for (let i = displayedCount; i < nextCount; i++) {
    fragment.appendChild(createCard(filteredSkins[i]));
  }

  grid.appendChild(fragment);
  displayedCount = nextCount;

  if (resultCount) {
    resultCount.textContent =
      `${displayedCount} / ${filteredSkins.length}件`;
  }

  if (loadAllButton) {
    loadAllButton.hidden =
      displayedCount >= filteredSkins.length;
  }
}

/* スキンを絞り込み、並べ替えて表示 */
function render() {
  if (
    !grid ||
    !search ||
    !characterFilter ||
    !seriesFilter ||
    !categoryFilter ||
    !sort ||
    !resultCount ||
    !emptyMessage
  ) {
    console.error("HTML内に必要な表示要素が見つかりません。");
    return;
  }

  const keyword = search.value.trim().toLocaleLowerCase();

  let filtered = skins.filter(skin => {
    const searchable = [
      skin.id,
      skin.character,
      skin.skinName,
      skin.series,
      skin.rarity,
      skin.category,
      skin.releaseDate
    ].join(" ").toLocaleLowerCase();

    return (
      searchable.includes(keyword) &&
      (!characterFilter.value ||
        skin.character === characterFilter.value) &&
      (!seriesFilter.value ||
        skin.series === seriesFilter.value) &&
      (!categoryFilter.value ||
        skin.category === categoryFilter.value)
    );
  });

  filtered.sort((a, b) => {
    const dateA = parseDate(a.releaseDate);
    const dateB = parseDate(b.releaseDate);

    // 日付未登録・形式不明は先頭
    if (dateA === null && dateB !== null) return -1;
    if (dateA !== null && dateB === null) return 1;

    if (sort.value === "newest") {
      return (dateB ?? 0) - (dateA ?? 0);
    }

    if (sort.value === "oldest") {
      return (dateA ?? 0) - (dateB ?? 0);
    }

    if (sort.value === "character") {
      return (a.character || "").localeCompare(
        b.character || "", "ja"
      );
    }

    return (a.skinName || "").localeCompare(
      b.skinName || "", "ja"
    );
  });

  // 絞り込み結果を先頭から表示し直す
  filteredSkins = filtered;
  displayedCount = 0;
  grid.replaceChildren();

  emptyMessage.hidden = filtered.length !== 0;

  if (filtered.length === 0) {
    emptyMessage.textContent = "該当するスキンがありません";
  }

  loadNextBatch();
}

/* すべて読み込むボタン */
if (loadAllButton) {
  loadAllButton.addEventListener("click", () => {
    while (displayedCount < filteredSkins.length) {
      loadNextBatch();
    }
  });
}

/* 一覧の下まで来たら自動で次の50件を読み込む */
if (grid && "IntersectionObserver" in window) {
  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.height = "1px";

  grid.insertAdjacentElement("afterend", sentinel);

  const observer = new IntersectionObserver(entries => {
    if (
      entries.some(entry => entry.isIntersecting) &&
      displayedCount < filteredSkins.length
    ) {
      loadNextBatch();
    }
  }, {
    rootMargin: "300px"
  });

  observer.observe(sentinel);
}

// CSVを読み込んで初期設定
async function init() {
  if (!grid || !emptyMessage || !resultCount) {
    console.error(
      "必要なHTML要素が見つかりません。HTMLのIDを確認してください。"
    );
    return;
  }

  emptyMessage.hidden = false;
  emptyMessage.textContent = "スキンデータを読み込み中…";

  try {
    const response = await fetch(CSV_URL, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const csvText = await response.text();
    const parsedSkins = parseCSV(csvText);

    skins = parsedSkins.filter(skin =>
      skin.character && skin.skinName
    );

    if (skins.length === 0) {
      throw new Error(
        "スキンデータがありません。CSVの1行目の列名を確認してください。"
      );
    }

    populateSelect(
      characterFilter,
      skins.map(skin => skin.character)
    );

    populateSelect(
      seriesFilter,
      skins.map(skin => skin.series)
    );

    populateSelect(
      categoryFilter,
      skins.map(skin => skin.category)
    );

    render();
  } catch (error) {
    console.error("スキンデータの読み込みに失敗しました", error);

    grid.replaceChildren();
    resultCount.textContent = "0件";
    emptyMessage.hidden = false;
    emptyMessage.textContent =
      "データを読み込めませんでした。公開設定、CSVのURL、列名を確認してください。";
  }
}

// 検索・絞り込み・並べ替え
[
  search,
  characterFilter,
  seriesFilter,
  categoryFilter,
  sort
].forEach(control => {
  if (!control) return;

  control.addEventListener("input", render);
  control.addEventListener("change", render);
});

// 絞り込みをリセット
const resetButton = document.getElementById("resetFilters");

if (resetButton) {
  resetButton.addEventListener("click", () => {
    search.value = "";
    characterFilter.value = "";
    seriesFilter.value = "";
    categoryFilter.value = "";
    sort.value = "newest";
    render();
  });
}

// 拡大画像を閉じる
const closeButton = document.getElementById("closeDialog");
const imageDialog = document.getElementById("imageDialog");

if (closeButton && imageDialog) {
  closeButton.addEventListener("click", () => {
    imageDialog.close();
  });
}

// 起動
init();
