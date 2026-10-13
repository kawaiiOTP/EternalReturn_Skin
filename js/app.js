
const skins = window.SKIN_DATA || [];

const grid = document.getElementById("skinGrid");
const search = document.getElementById("search");
const characterFilter = document.getElementById("characterFilter");
const seriesFilter = document.getElementById("seriesFilter");
const categoryFilter = document.getElementById("categoryFilter");
const sort = document.getElementById("sort");
const resultCount = document.getElementById("resultCount");
const emptyMessage = document.getElementById("emptyMessage");

const unique = values =>
  [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ja")
  );

function populateSelect(select, values) {
  unique(values).forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

populateSelect(characterFilter, skins.map(s => s.character));
populateSelect(seriesFilter, skins.map(s => s.series));

function createTag(text) {
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = text;
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
    img.alt = skin.skinName;
    img.loading = "lazy";

    img.addEventListener("error", () => {
      imageArea.classList.remove("has-image");
      imageArea.textContent = "画像準備中";
    });

    imageArea.classList.add("has-image");
    imageArea.appendChild(img);

    if (skin.full) {
      imageArea.addEventListener("click", () => {
        const dialog = document.getElementById("imageDialog");
        const fullImage = document.getElementById("fullImage");

        fullImage.src = skin.full;
        fullImage.alt = skin.skinName;
        document.getElementById("dialogCaption").textContent =
          `${skin.character} / ${skin.skinName}`;

        dialog.showModal();
      });
    }
  } else {
    imageArea.textContent = "画像準備中";
  }

  const info = document.createElement("div");
  info.className = "skin-info";

  const title = document.createElement("h2");
  title.className = "skin-name";
  title.textContent = skin.skinName;

  const character = document.createElement("div");
  character.className = "skin-character";
  character.textContent = skin.character;

  const tags = document.createElement("div");
  tags.className = "tags";
  tags.append(
    createTag(skin.series),
    createTag(skin.category)
  );

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
      skin.character,
      skin.skinName,
      skin.series,
      skin.category
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
      return (b.releaseDate || "").localeCompare(a.releaseDate || "");
    }
    if (sort.value === "oldest") {
      return (a.releaseDate || "9999").localeCompare(
        b.releaseDate || "9999"
      );
    }
    if (sort.value === "character") {
      return a.character.localeCompare(b.character, "ja");
    }
    return a.skinName.localeCompare(b.skinName, "ja");
  });

  grid.replaceChildren(...filtered.map(createCard));
  resultCount.textContent = `${filtered.length}件`;
  emptyMessage.hidden = filtered.length !== 0;
}

[search, characterFilter, seriesFilter, categoryFilter, sort]
  .forEach(control => control.addEventListener("input", render));

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

render();
