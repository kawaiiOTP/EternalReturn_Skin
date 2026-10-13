
const skins = window.SKIN_DATA || [];
const rankingList = document.getElementById("rankingList");
const rankingSearch = document.getElementById("rankingSearch");
const rankingCount = document.getElementById("rankingCount");
const rankingDate = document.getElementById("rankingDate");
const rankingEmpty = document.getElementById("rankingEmpty");

function getRanking() {
  const latestByCharacter = new Map();

  skins.forEach(skin => {
    if (!skin.character || !skin.releaseDate) return;

    const date = new Date(`${skin.releaseDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return;

    const previous = latestByCharacter.get(skin.character);

    if (!previous || date > previous.date) {
      latestByCharacter.set(skin.character, {
        character: skin.character,
        skinName: skin.skinName,
        releaseDate: skin.releaseDate,
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

function renderRanking() {
  const keyword = rankingSearch.value.trim().toLocaleLowerCase();

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
      `最新スキン：${item.skinName} / 実装日：${item.releaseDate}`;

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

rankingSearch.addEventListener("input", renderRanking);
renderRanking();
