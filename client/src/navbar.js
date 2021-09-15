const themeMap = {
  dark: "light",
  light: "solar",
  solar: "dark"
};

const theme = localStorage.getItem('theme')
  || (tmp = Object.keys(themeMap)[0],
    localStorage.setItem('theme', tmp),
    tmp);
const bodyClass = document.body.classList;
bodyClass.add(theme);
displayImage(theme);

function displayImage(next) {
  const darkMode = document.getElementById('darkModeImage');
  const lightMode = document.getElementById('lightModeImage');
  if (lightMode == null) {
    return;
  }
  if (next == "light") {
    darkMode.style.display = "none";
    lightMode.style.display = "block";
  } else if (next == "solar" || next == "dark") {
    darkMode.style.display = "block";
    lightMode.style.display = "none";
  }
}

function toggleTheme() {
  const current = localStorage.getItem('theme');
  const next = themeMap[current];

  bodyClass.replace(current, next);
  localStorage.setItem('theme', next);
  displayImage(next);
}

document.getElementById('themeButton').onclick = toggleTheme;
