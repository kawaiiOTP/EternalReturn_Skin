
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQOx6fV8tgiG9IVDIOE3BPNDKEyUpCbd70ROzu8HWTIKIPl_TlXZluTd-jrn5as_15-DZtlINiSNDqJ/pub?gid=0&single=true&output=csv";

let skins = [];

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

const unique = values =>
  [...new Set(values.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ja"));

function populateSelect(select, values) {
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

function createTag(text) {
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = text || "未分類";
  return tag;
}

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
      imageArea.classList.remove("has-image");
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

        if (!dialog || !fullImage) return;

        fullImage.src = skin.full;
        fullImage.alt = skin.skinName || "スキン画像";

        document.getElementById("dialogCaption").textContent =
          `${skin.character} / ${skin.skinName}`;

        dialog.showModal();
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

  [skin.series, skin.rarity, skin.category]
    .filter(Boolean)
    .forEach(value => tags.appendChild(createTag(value)));

  const date = document.createElement("div");
  date.className = "skin-date";
  date.textContent = skin.releaseDate
    ? `実装日：${skin.releaseDate}`
    : "実装日：未登録";

  info.append(title, character, tags, date);
  card.append(imageArea, info);

  return card;
}

function render() {
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
    if (sort.value === "newest") {
      return (b.releaseDate || "").localeCompare(
        a.releaseDate || ""
      );
    }

    if (sort.value === "oldest") {
      return (a.releaseDate || "9999").localeCompare(
        b.releaseDate || "9999"
      );
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

  grid.replaceChildren(...filtered.map(createCard));

  resultCount.textContent = `${filtered.length}件`;
  emptyMessage.hidden = filtered.length !== 0;

  if (filtered.length === 0) {
    emptyMessage.textContent = "該当するスキンがありません";
  }
}

async function init() {
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
    skins = parseCSV(csvText).filter(skin =>
      skin.character && skin.skinName
    );

    if (skins.length === 0) {
      throw new Error("スキンデータがありません");
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
      "データを読み込めませんでした。公開設定とCSVのURLを確認してください。";
  }
}

[search, characterFilter, seriesFilter, categoryFilter, sort]
  .forEach(control => {
    control.addEventListener("input", render);
    control.addEventListener("change", render);
  });

document.getElementById("resetFilters").addEventListener("click", () => {
  search.value = "";
  characterFilter.value = "";
  seriesFilter.value = "";
  categoryFilter.value = "";
  sort.value = "newest";
  render();
});

document.getElementById("closeDialog").addEventListener("click", () => {
  document.getElementById("imageDialog").close();
});

init();
