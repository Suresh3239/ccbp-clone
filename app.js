const DATA = "data/";
const LANG_ORDER = ["te", "en", "hi", "kn", "ta", "mr", "bn", "ml"];
const LANG_FALLBACK = {
  en: "English", te: "తెలుగు", hi: "हिन्दी", kn: "ಕನ್ನಡ",
  ta: "தமிழ்", mr: "मराठी", bn: "বাংলা", ml: "മലയാളം"
};

const state = {
  courses: null,
  languages: null,
  courseCache: new Map(),
  search: null,
  library: null,
  allVideos: null,
  prefLang: localStorage.getItem("ccbp.lang") || "te",
  currentCourseId: null,
  playground: null,
  pgTimer: null,
  practice: null,
  practiceTimer: null,
  practiceRunId: null,
  practiceWorker: null,
  practiceWorkerUrl: null,
  lessonPractice: null,
  lessonPracticeTimer: null,
  lessonPracticeWorker: null,
  lessonPracticeWorkerUrl: null,
  hls: null,
  libLimit: 60,
  linksLimit: 100,
  libFilters: { q: "", course: "", lang: "", kind: "" },
  linkFilters: { q: "", course: "", lang: "" }
};

const ICONS = {
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  external: '<path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>',
  arrowLeft: '<path d="m15 18-6-6 6-6"/><path d="M9 12h12"/>',
  arrowRight: '<path d="m9 18 6-6-6-6"/><path d="M3 12h12"/>',
  code: '<path d="m8 6-6 6 6 6"/><path d="m16 6 6 6-6 6"/>',
  save: '<path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3"/><path d="M8 21v-7h8v7"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v6h-6"/>',
  terminal: '<path d="m4 7 5 5-5 5"/><path d="M12 19h8"/>',
  expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  collapse: '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M16 3v3a2 2 0 0 0 2 2h3"/><path d="M8 21v-3a2 2 0 0 0-2-2H3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>'
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}
const attr = esc;

function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN");
}

function fmtDuration(sec) {
  const n = Number(sec || 0);
  if (!n) return "—";
  const h = Math.floor(n / 3600);
  const m = Math.round((n % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m || 1}m`;
}

function langLabel(code) {
  return (state.languages && state.languages[code]) || LANG_FALLBACK[code] || String(code).toUpperCase();
}

function iconForUnit(unit) {
  const res = unit.resources && unit.resources[0];
  if (res && res.type === "INTERACTIVE_VIDEO") return { cls: "video", icon: "play", label: "Video" };
  if (res && (res.content || "").trim()) return { cls: "reading", icon: "book", label: "Reading" };
  if (unit.type === "PRACTICE") return { cls: "practice", icon: "check", label: "Practice" };
  if (unit.type === "EXAM") return { cls: "exam", icon: "file", label: "Exam" };
  if (unit.type === "QUESTION_SET") return { cls: "practice", icon: "check", label: "Quiz" };
  return { cls: "reading", icon: "file", label: "Unit" };
}

async function loadJSON(name) {
  const res = await fetch(DATA + name, { cache: "no-store" });
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
  return res.json();
}

let basePromise = null;
async function ensureBase() {
  if (state.courses) return;
  if (!basePromise) {
    basePromise = Promise.all([loadJSON("courses.json"), loadJSON("languages.json")])
      .then(([courses, languages]) => {
        state.courses = courses;
        state.languages = languages;
      })
      .catch(err => { basePromise = null; throw err; });
  }
  await basePromise;
}

async function getCourse(id) {
  if (!state.courseCache.has(id)) {
    state.courseCache.set(id, await loadJSON(`course/${id}.json`));
  }
  return state.courseCache.get(id);
}

function updateTopCount() {
  const el = $("#topCount");
  if (el && state.courses) el.textContent = fmtNum(state.courses.counts.videos);
}

function buildPrefLang() {
  const sel = $("#prefLang");
  if (!sel) return;
  const codes = LANG_ORDER.filter(code => state.languages && state.languages[code]);
  if (!codes.includes(state.prefLang)) state.prefLang = codes.includes("en") ? "en" : (codes[0] || "en");
  sel.innerHTML = codes.map(code => `<option value="${attr(code)}">${esc(langLabel(code))}</option>`).join("");
  sel.value = state.prefLang;
  sel.addEventListener("change", () => {
    state.prefLang = sel.value;
    localStorage.setItem("ccbp.lang", state.prefLang);
    if (location.hash.includes("/lesson/")) route();
  });
}

function renderSideCourses() {
  const box = $("#sideCourses");
  if (!box || !state.courses) return;
  box.innerHTML = state.courses.courses.map(c => {
    const done = Number(c.completion || 0) >= 100;
    const locked = c.availability === "LOCKED";
    return `<a class="side-course ${done ? "done" : ""} ${locked ? "locked" : ""}" data-course-id="${attr(c.id)}" href="#/course/${attr(c.id)}">
      <span class="dot"></span><span>${esc(c.title)}</span>
    </a>`;
  }).join("");
}

function setActiveCourse(id) {
  $$(".side-course").forEach(a => a.classList.toggle("active", a.dataset.courseId === id));
}

function setActiveNav(key) {
  $$("[data-nav]").forEach(a => {
    const href = a.getAttribute("href");
    a.classList.toggle("active", href === key);
  });
}

function closeDrawer() {
  document.body.classList.remove("drawer-open");
  const bd = $("#drawerBackdrop");
  if (bd) bd.hidden = true;
}

function openDrawer() {
  document.body.classList.add("drawer-open");
  const bd = $("#drawerBackdrop");
  if (bd) bd.hidden = false;
}

function showToast(message) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.classList.remove("show"), 2200);
}

async function copyText(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  showToast("Copied to clipboard");
}

function videoDownloadHref(url, name) {
  if (!url) return "#";
  return `/download/video?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
}

function slidesDownloadHref(url, name) {
  if (!url) return "";
  return `/download/slides?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
}

async function downloadSlidesPdf(button) {
  const url = button.dataset.downloadSlides;
  if (!url || button.disabled) return;
  const original = button.innerHTML;
  const name = button.dataset.downloadName || "ccbp-slides.pdf";
  const started = Date.now();
  button.disabled = true;
  const tick = () => {
    const seconds = Math.max(0, Math.round((Date.now() - started) / 1000));
    button.innerHTML = `${icon("clock")} Preparing PDF… ${seconds}s`;
  };
  tick();
  const timer = setInterval(tick, 1000);
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      let message = `Slides download failed (${response.status})`;
      try {
        const detail = (await response.text()).trim();
        if (detail) message = detail.slice(0, 220);
      } catch (err) {}
      throw new Error(message);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    showToast("Slides PDF ready");
  } catch (err) {
    showToast(err.message || "Slides PDF failed");
  } finally {
    clearInterval(timer);
    button.disabled = false;
    button.innerHTML = original;
  }
}

function pageError(message) {
  return `<div class="empty-state"><h2>Could not load the clone</h2><p>${esc(message)}</p><p style="margin-top:10px">Start the local server with <code>python3 serve.py</code> and open <code>http://127.0.0.1:8001</code>.</p></div>`;
}

const PRACTICE_KEY = "ccbp.practice.v1";
const PRACTICE_CHALLENGES = [
  {
    id: "sum-array",
    title: "Sum an array",
    level: "Warm up",
    prompt: "Return the total of every number in an array. An empty array should return 0.",
    requirements: ["Use a loop or reduce", "Support negative numbers", "Do not change the input array"],
    starter: `function sumArray(numbers) {
  // Write your solution here
}`,
    hint: "Start with a total of 0, then add each number.",
    tests: [
      { name: "adds positive numbers", check: "sumArray([1, 2, 3]) === 6" },
      { name: "returns 0 for an empty array", check: "sumArray([]) === 0" },
      { name: "handles negative numbers", check: "sumArray([-2, 5, -1]) === 2" },
      { name: "handles a single number", check: "sumArray([10]) === 10" }
    ]
  },
  {
    id: "reverse-string",
    title: "Reverse a string",
    level: "Warm up",
    prompt: "Return a new string with the characters in reverse order.",
    requirements: ["Keep the original string unchanged", "Handle empty strings", "Handle single characters"],
    starter: `function reverseString(text) {
  // Write your solution here
}`,
    hint: "Strings can be split, reversed, and joined.",
    tests: [
      { name: "reverses a word", check: "reverseString(\"hello\") === \"olleh\"" },
      { name: "handles an empty string", check: "reverseString(\"\") === \"\"" },
      { name: "handles one character", check: "reverseString(\"a\") === \"a\"" },
      { name: "reverses uppercase letters", check: "reverseString(\"CCBP\") === \"PBCC\"" }
    ]
  },
  {
    id: "count-vowels",
    title: "Count vowels",
    level: "Easy",
    prompt: "Count the vowels in a string. Treat a, e, i, o, and u as vowels and ignore case.",
    requirements: ["Count uppercase and lowercase vowels", "Return 0 when there are none", "Spaces and punctuation do not count"],
    starter: `function countVowels(text) {
  // Write your solution here
}`,
    hint: "Lowercase the input first, then check each character.",
    tests: [
      { name: "counts lowercase vowels", check: "countVowels(\"hello\") === 2" },
      { name: "counts uppercase vowels", check: "countVowels(\"AEIOU\") === 5" },
      { name: "returns 0 with no vowels", check: "countVowels(\"rhythm\") === 0" },
      { name: "handles mixed case", check: "countVowels(\"NxtWave\") === 2" }
    ]
  },
  {
    id: "is-palindrome",
    title: "Palindrome check",
    level: "Easy",
    prompt: "Return true when text reads the same forwards and backwards. Ignore case, spaces, and punctuation.",
    requirements: ["Normalize case", "Ignore non-letter and non-number characters", "Empty strings count as palindromes"],
    starter: `function isPalindrome(text) {
  // Write your solution here
}`,
    hint: "Build a cleaned string, then compare it with its reverse.",
    tests: [
      { name: "detects a simple palindrome", check: "isPalindrome(\"madam\") === true" },
      { name: "ignores letter case", check: "isPalindrome(\"Racecar\") === true" },
      { name: "rejects a non-palindrome", check: "isPalindrome(\"hello\") === false" },
      { name: "ignores spaces and punctuation", check: "isPalindrome(\"A man, a plan, a canal: Panama\") === true" },
      { name: "accepts an empty string", check: "isPalindrome(\"\") === true" }
    ]
  },
  {
    id: "fizz-buzz",
    title: "FizzBuzz",
    level: "Easy",
    prompt: "Return an array from 1 to n. Use Fizz for multiples of 3, Buzz for multiples of 5, and FizzBuzz for multiples of both. Every other number becomes a string.",
    requirements: ["Start at 1 and include n", "Return an empty array when n is 0", "Return strings for every value"],
    starter: `function fizzBuzz(n) {
  // Write your solution here
}`,
    hint: "Check divisibility by 3 and 5 before the individual cases.",
    tests: [
      { name: "builds the first five values", check: "JSON.stringify(fizzBuzz(5)) === JSON.stringify([\"1\", \"2\", \"Fizz\", \"4\", \"Buzz\"])" },
      { name: "uses FizzBuzz at 15", check: "fizzBuzz(15)[14] === \"FizzBuzz\"" },
      { name: "handles n = 0", check: "JSON.stringify(fizzBuzz(0)) === JSON.stringify([])" },
      { name: "uses Fizz at 3", check: "fizzBuzz(3)[2] === \"Fizz\"" }
    ]
  },
  {
    id: "largest-number",
    title: "Largest number",
    level: "Easy",
    prompt: "Return the largest number in an array. Return null for an empty array.",
    requirements: ["Do not sort the original array", "Handle negative numbers", "Return null for an empty array"],
    starter: `function largestNumber(numbers) {
  // Write your solution here
}`,
    hint: "Track the best value seen so far.",
    tests: [
      { name: "finds the largest value", check: "largestNumber([3, 9, 2]) === 9" },
      { name: "handles negative values", check: "largestNumber([-5, -1, -9]) === -1" },
      { name: "handles one value", check: "largestNumber([42]) === 42" },
      { name: "returns null for an empty array", check: "largestNumber([]) === null" }
    ]
  },
  {
    id: "flatten-array",
    title: "Flatten nested arrays",
    level: "Medium",
    prompt: "Flatten arbitrarily nested arrays into a single array, preserving order.",
    requirements: ["Handle any depth of nesting", "Preserve the original order", "Do not mutate the input"],
    starter: `function flattenArray(items) {
  // Write your solution here
}`,
    hint: "Use recursion or reduce with Array.isArray.",
    tests: [
      { name: "flattens one level", check: "JSON.stringify(flattenArray([[1, 2], [3, 4]])) === JSON.stringify([1, 2, 3, 4])" },
      { name: "flattens deep nesting", check: "JSON.stringify(flattenArray([1, [2, [3, [4]]]])) === JSON.stringify([1, 2, 3, 4])" },
      { name: "handles an empty array", check: "JSON.stringify(flattenArray([])) === JSON.stringify([])" },
      { name: "removes empty nested arrays", check: "JSON.stringify(flattenArray([[], [1]])) === JSON.stringify([1])" }
    ]
  },
  {
    id: "two-sum",
    title: "Two sum",
    level: "Medium",
    prompt: "Return the indices of the first pair of numbers that add up to the target. Return null when no pair exists. The smaller index comes first.",
    requirements: ["Use each index at most once", "Return null when there is no pair", "Return exactly two indices"],
    starter: `function twoSum(numbers, target) {
  // Write your solution here
}`,
    hint: "A map from value to index avoids checking every pair twice.",
    tests: [
      { name: "finds a basic pair", check: "JSON.stringify(twoSum([2, 7, 11, 15], 9)) === JSON.stringify([0, 1])" },
      { name: "finds a later pair", check: "JSON.stringify(twoSum([3, 2, 4], 6)) === JSON.stringify([1, 2])" },
      { name: "handles duplicate values", check: "JSON.stringify(twoSum([3, 3], 6)) === JSON.stringify([0, 1])" },
      { name: "returns null when no pair exists", check: "twoSum([1, 2], 7) === null" }
    ]
  },
  {
    id: "capitalize-words",
    title: "Capitalize words",
    level: "Warm up",
    prompt: "Capitalize the first letter of each word and lowercase the remaining letters.",
    requirements: ["Handle multiple words", "Handle an empty string", "Normalize mixed case"],
    starter: `function capitalizeWords(text) {
  // Write your solution here
}`,
    hint: "Split on spaces, transform each word, then join.",
    tests: [
      { name: "capitalizes two words", check: "capitalizeWords(\"hello world\") === \"Hello World\"" },
      { name: "lowercases the rest of a word", check: "capitalizeWords(\"CCBP learning\") === \"Ccbp Learning\"" },
      { name: "handles an empty string", check: "capitalizeWords(\"\") === \"\"" },
      { name: "handles one letter", check: "capitalizeWords(\"a\") === \"A\"" }
    ]
  },
  {
    id: "chunk-array",
    title: "Chunk an array",
    level: "Medium",
    prompt: "Split an array into smaller arrays of the given size. The final chunk may be shorter. Return an empty array when size is zero or negative.",
    requirements: ["Preserve order", "Handle a size larger than the array", "Return an empty array for invalid sizes"],
    starter: `function chunkArray(items, size) {
  // Write your solution here
}`,
    hint: "Walk the array in steps of size and use slice.",
    tests: [
      { name: "splits into even chunks", check: "JSON.stringify(chunkArray([1, 2, 3, 4, 5], 2)) === JSON.stringify([[1, 2], [3, 4], [5]])" },
      { name: "splits into threes", check: "JSON.stringify(chunkArray([1, 2, 3, 4, 5], 3)) === JSON.stringify([[1, 2, 3], [4, 5]])" },
      { name: "handles an empty array", check: "JSON.stringify(chunkArray([], 2)) === JSON.stringify([])" },
      { name: "handles a size larger than the array", check: "JSON.stringify(chunkArray([1, 2, 3], 10)) === JSON.stringify([[1, 2, 3]])" },
      { name: "rejects a zero size", check: "JSON.stringify(chunkArray([1, 2, 3], 0)) === JSON.stringify([])" }
    ]
  }
];

const LESSON_PRACTICE_KEY = "ccbp.lesson.practice.v1";
const LESSON_PRACTICE_RUN_ID = "ccbp.lesson.practice.run.v1";

function lessonPracticeState() {
  if (state.lessonPractice) return state.lessonPractice;
  try {
    const saved = JSON.parse(localStorage.getItem(LESSON_PRACTICE_KEY) || "null");
    if (saved && typeof saved === "object") {
      state.lessonPractice = { solved: saved.solved || {}, code: saved.code || {} };
      return state.lessonPractice;
    }
  } catch (err) {}
  state.lessonPractice = { solved: {}, code: {} };
  return state.lessonPractice;
}

function lessonPracticePersist() {
  localStorage.setItem(LESSON_PRACTICE_KEY, JSON.stringify(lessonPracticeState()));
}

function lpKey(courseId, unitId) {
  return `${courseId}::${unitId}`;
}

function lessonPracticeForUnit(unit, topic) {
  const base = `${unit.name} ${topic.name}`.toLowerCase();
  const has = pattern => pattern.test(base);
  const items = [];

  if (has(/\barrays?\b/)) {
    items.push({
      id: "lp-arr-sum",
      title: "Sum array elements",
      level: "Lesson",
      prompt: "Write a function sumArray(arr) that returns the sum of all numbers in arr. Return 0 for empty array.",
      requirements: ["Use numbers only", "Handle empty array", "Return a number"],
      starter: `function sumArray(arr) {\n  // write your code\n}`,
      tests: [
        { name: "sum of [1,2,3]", check: "sumArray([1,2,3]) === 6" },
        { name: "empty array", check: "sumArray([]) === 0" },
        { name: "negative numbers", check: "sumArray([-1,2,-3]) === -2" }
      ]
    });
    items.push({
      id: "lp-arr-max",
      title: "Find maximum",
      level: "Lesson",
      prompt: "Write a function maxArr(arr) that returns the largest number. Return null for empty array.",
      requirements: ["Don't use Math.max on spread if not needed", "Return null for []"],
      starter: `function maxArr(arr) {\n  // write your code\n}`,
      tests: [
        { name: "max of [5,2,9]", check: "maxArr([5,2,9]) === 9" },
        { name: "empty array", check: "maxArr([]) === null" },
        { name: "single element", check: "maxArr([7]) === 7" }
      ]
    });
  }

  if (has(/\bstrings?\b/)) {
    items.push({
      id: "lp-str-rev",
      title: "Reverse string",
      level: "Lesson",
      prompt: "Write a function reverseStr(s) that returns the reversed string.",
      requirements: ["Return a new string", "Handle empty string"],
      starter: `function reverseStr(s) {\n  // write your code\n}`,
      tests: [
        { name: "reverse hello", check: "reverseStr('hello') === 'olleh'" },
        { name: "empty", check: "reverseStr('') === ''" },
        { name: "single char", check: "reverseStr('a') === 'a'" }
      ]
    });
    items.push({
      id: "lp-str-count",
      title: "Count vowels",
      level: "Lesson",
      prompt: "Write a function countVowels(s) that counts a,e,i,o,u (case-insensitive).",
      requirements: ["Ignore case", "Return number"],
      starter: `function countVowels(s) {\n  // write your code\n}`,
      tests: [
        { name: "hello", check: "countVowels('hello') === 2" },
        { name: "AEIOU", check: "countVowels('AEIOU') === 5" },
        { name: "bcdfg", check: "countVowels('bcdfg') === 0" }
      ]
    });
  }

  if (has(/\b(loops?|for|while)\b/)) {
    items.push({
      id: "lp-loop-table",
      title: "Multiplication table values",
      level: "Lesson",
      prompt: "Write a function table(n) that returns an array of [1*n, 2*n, 3*n, 4*n, 5*n].",
      requirements: ["Use a loop", "Return array"],
      starter: `function table(n) {\n  // write your code\n}`,
      tests: [
        { name: "table 5", check: "JSON.stringify(table(5)) === JSON.stringify([5,10,15,20,25])" },
        { name: "table 2", check: "JSON.stringify(table(2)) === JSON.stringify([2,4,6,8,10])" }
      ]
    });
  }

  if (has(/\bfunctions?\b/)) {
    items.push({
      id: "lp-fn-add",
      title: "Add two numbers",
      level: "Lesson",
      prompt: "Write a function add(a,b) that returns a+b.",
      requirements: ["Return sum", "Work with numbers"],
      starter: `function add(a,b) {\n  // write your code\n}`,
      tests: [
        { name: "2+3", check: "add(2,3) === 5" },
        { name: "-1+5", check: "add(-1,5) === 4" },
        { name: "0+0", check: "add(0,0) === 0" }
      ]
    });
  }

  if (has(/\b(if|conditions?|conditionals?)\b/)) {
    items.push({
      id: "lp-if-even",
      title: "Even or odd",
      level: "Lesson",
      prompt: "Write a function evenOdd(num) that returns 'even' if num is even else 'odd'.",
      requirements: ["Use if/else", "Return string"],
      starter: `function evenOdd(num) {\n  // write your code\n}`,
      tests: [
        { name: "4 even", check: "evenOdd(4) === 'even'" },
        { name: "5 odd", check: "evenOdd(5) === 'odd'" },
        { name: "0 even", check: "evenOdd(0) === 'even'" }
      ]
    });
  }

  if (has(/\b(objects?|json)\b/)) {
    items.push({
      id: "lp-obj-get",
      title: "Get property",
      level: "Lesson",
      prompt: "Write a function getName(obj) that returns obj.name. If missing return 'unknown'.",
      requirements: ["Check for existence", "Return string"],
      starter: `function getName(obj) {\n  // write your code\n}`,
      tests: [
        { name: "has name", check: "getName({name:'Rahul'}) === 'Rahul'" },
        { name: "missing", check: "getName({}) === 'unknown'" },
        { name: "null-like", check: "getName({age:20}) === 'unknown'" }
      ]
    });
  }

  if (items.length === 0) {
    items.push({
      id: "lp-gen-cap",
      title: "Capitalize first letter",
      level: "Lesson",
      prompt: "Write a function capitalize(s) that capitalizes only the first letter and lowercases the rest.",
      requirements: ["Handle empty string", "Handle single char"],
      starter: `function capitalize(s) {\n  // write your code\n}`,
      tests: [
        { name: "hello", check: "capitalize('hello') === 'Hello'" },
        { name: "CCBP", check: "capitalize('CCBP') === 'Ccbp'" },
        { name: "empty", check: "capitalize('') === ''" }
      ]
    });
    items.push({
      id: "lp-gen-trim",
      title: "Count spaces",
      level: "Lesson",
      prompt: "Write a function countSpaces(s) that returns number of space characters.",
      requirements: ["Count ' ' only", "Return number"],
      starter: `function countSpaces(s) {\n  // write your code\n}`,
      tests: [
        { name: "two spaces", check: "countSpaces('a b c') === 2" },
        { name: "none", check: "countSpaces('abc') === 0" },
        { name: "empty", check: "countSpaces('') === 0" }
      ]
    });
  }

  return items.slice(0, 3);
}

function lessonPracticeWorkerSource(tests, code) {
  const cases = JSON.stringify(tests);
  return `try {
${code}
} catch (error) {
  self.postMessage({ fatal: String(error) });
  self.close();
}
var cases = ${cases};
var results = cases.map(function (test) {
  try {
    return { name: test.name, pass: Boolean(eval(test.check)) };
  } catch (error) {
    return { name: test.name, pass: false, error: String(error) };
  }
});
self.postMessage({ results: results });
`;
}

function lessonPracticeStopWorker() {
  if (state.lessonPracticeWorker) {
    try { state.lessonPracticeWorker.terminate(); } catch (err) {}
    state.lessonPracticeWorker = null;
  }
  if (state.lessonPracticeWorkerUrl) {
    try { URL.revokeObjectURL(state.lessonPracticeWorkerUrl); } catch (err) {}
    state.lessonPracticeWorkerUrl = null;
  }
}

function lessonPracticeRun(key, tests) {
  const codeEl = document.getElementById('lessonPracticeCode');
  const box = document.getElementById('lessonPracticeResults');
  if (!codeEl || !box) return;
  const st = lessonPracticeState();
  st.code[key] = codeEl.value;
  lessonPracticePersist();
  localStorage.setItem(LESSON_PRACTICE_RUN_ID, key);
  box.innerHTML = `<div class="practice-running"><span class="spinner"></span> Running ${tests.length} tests…</div>`;
  clearTimeout(state.lessonPracticeTimer);
  lessonPracticeStopWorker();
  const blob = new Blob([lessonPracticeWorkerSource(tests, codeEl.value)], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  state.lessonPracticeWorker = worker;
  state.lessonPracticeWorkerUrl = url;
  worker.onmessage = event => {
    clearTimeout(state.lessonPracticeTimer);
    lessonPracticeStopWorker();
    const data = event.data || {};
    if (data.fatal) {
      box.innerHTML = `<div class="practice-result-head fail">${icon("refresh")} Your code stopped early</div><p class="practice-empty">${esc(data.fatal)}</p>`;
      return;
    }
    const results = Array.isArray(data.results) ? data.results : [];
    const passed = results.filter(item => item.pass).length;
    const all = results.length > 0 && passed === results.length;
    box.innerHTML = `
      <div class="practice-result-head ${all ? "pass" : "fail"}">${icon(all ? "check" : "refresh")} ${passed}/${results.length} tests passed</div>
      <div class="practice-result-list">
        ${results.map(item => `<div class="practice-result ${item.pass ? "pass" : "fail"}"><span class="practice-result-mark">${item.pass ? "✓" : "×"}</span><span><b>${esc(item.name)}</b>${item.error ? `<small>${esc(item.error)}</small>` : ""}</span></div>`).join("")}
      </div>`;
    if (all) {
      st.solved[key] = true;
      lessonPracticePersist();
      const badge = document.getElementById('lessonPracticeBadge');
      if (badge) badge.innerHTML = icon('check') + ' Solved';
      const card = document.getElementById('lessonPracticeCard');
      if (card) card.classList.add('solved');
    }
  };
  worker.onerror = event => {
    clearTimeout(state.lessonPracticeTimer);
    lessonPracticeStopWorker();
    box.innerHTML = `<div class="practice-result-head fail">${icon("refresh")} Your code stopped early</div><p class="practice-empty">${esc(event.message || "Error")}</p>`;
  };
  state.lessonPracticeTimer = setTimeout(() => {
    lessonPracticeStopWorker();
    box.innerHTML = `<div class="practice-result-head fail">${icon("refresh")} Timed out</div><p class="practice-empty">Your code took too long. Check for an infinite loop and run again.</p>`;
  }, 2000);
}

function renderLessonPractice(course, topic, unit) {
  const key = lpKey(course.id, unit.id);
  const st = lessonPracticeState();
  const list = lessonPracticeForUnit(unit, topic);
  const activeId = list[0].id;
  const item = list.find(x => x.id === activeId) || list[0];
  const savedCode = st.code[key + '::' + item.id] || item.starter;
  const solved = !!st.solved[key + '::' + item.id];
  const options = list.map(x => `<button class="lesson-prac-tab ${x.id === activeId ? "active" : ""}" data-lp-tab="${attr(x.id)}">${esc(x.title)}</button>`).join("");
  return `<div class="lesson-practice-wrap">
    <div class="lesson-practice-head">
      <div>
        <span class="practice-level">Coding practice</span>
        <h2>Practice for this lesson</h2>
        <p>Small tasks based on ${esc(topic.name)} • ${esc(unit.name)}</p>
      </div>
      <span class="chip ${solved ? "green" : "gray"}" id="lessonPracticeBadge">${solved ? icon("check") + " Solved" : "Not solved"}</span>
    </div>
    <div class="lesson-practice-grid">
      <div class="lesson-practice-list" id="lessonPracticeList">
        ${options}
      </div>
      <div class="lesson-practice-card" id="lessonPracticeCard" data-lp-key="${attr(key)}" data-lp-active="${attr(activeId)}">
        <div class="lesson-practice-card-head">
          <div>
            <b id="lessonPracticeTitle">${esc(item.title)}</b>
            <span id="lessonPracticeLevel">${esc(item.level)}</span>
          </div>
        </div>
        <p class="lesson-practice-prompt" id="lessonPracticePrompt">${esc(item.prompt)}</p>
        <ul class="lesson-practice-req" id="lessonPracticeReq">${item.requirements.map(r => `<li>${esc(r)}</li>`).join("")}</ul>
        <div class="lesson-practice-editor-head"><span>${icon("code")} JavaScript</span></div>
        <textarea class="lesson-practice-code" id="lessonPracticeCode" spellcheck="false">${esc(savedCode)}</textarea>
        <div class="lesson-practice-actions">
          <button class="btn primary" id="lessonPracticeRun">${icon("play")} Run tests</button>
          <button class="btn" id="lessonPracticeStarter">Reset to starter</button>
        </div>
        <div class="lesson-practice-results" id="lessonPracticeResults">
          <div class="practice-empty">Run the tests when you're ready.</div>
        </div>
      </div>
    </div>
  </div>`;
}

function bindLessonPractice(course, topic, unit) {
  const list = lessonPracticeForUnit(unit, topic);
  const key = lpKey(course.id, unit.id);
  const card = document.getElementById('lessonPracticeCard');
  if (!card) return;
  let activeId = list[0].id;
  const st = lessonPracticeState();
  const codeEl = document.getElementById('lessonPracticeCode');
  const resultsEl = document.getElementById('lessonPracticeResults');

  function loadItem(id) {
    const it = list.find(x => x.id === id) || list[0];
    activeId = it.id;
    card.dataset.lpActive = activeId;
    document.getElementById('lessonPracticeTitle').textContent = it.title;
    document.getElementById('lessonPracticeLevel').textContent = it.level;
    document.getElementById('lessonPracticePrompt').textContent = it.prompt;
    document.getElementById('lessonPracticeReq').innerHTML = it.requirements.map(r => `<li>${esc(r)}</li>`).join('');
    codeEl.value = st.code[key + '::' + it.id] || it.starter;
    if (resultsEl) resultsEl.innerHTML = `<div class="practice-empty">Run the tests when you're ready.</div>`;
    document.querySelectorAll('.lesson-prac-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.lpTab === it.id));
    card.dataset.lpTests = JSON.stringify(it.tests);
    card.dataset.lpStarter = it.starter;
    const badge = document.getElementById('lessonPracticeBadge');
    if (badge) {
      const done = !!st.solved[key + '::' + it.id];
      badge.className = 'chip ' + (done ? 'green' : 'gray');
      badge.innerHTML = done ? icon('check') + ' Solved' : 'Not solved';
    }
  }

  card.dataset.lpTests = JSON.stringify(list[0].tests);
  card.dataset.lpStarter = list[0].starter;

  document.querySelectorAll('.lesson-prac-tab').forEach(btn => {
    btn.addEventListener('click', () => loadItem(btn.dataset.lpTab));
  });

  codeEl.addEventListener('input', () => {
    const it = list.find(x => x.id === activeId) || list[0];
    const cur = lessonPracticeState();
    cur.code[key + '::' + it.id] = codeEl.value;
    lessonPracticePersist();
  });
  codeEl.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      const it = list.find(x => x.id === activeId) || list[0];
      lessonPracticeRun(key + '::' + it.id, it.tests);
    }
  });

  document.getElementById('lessonPracticeRun').addEventListener('click', () => {
    const it = list.find(x => x.id === activeId) || list[0];
    lessonPracticeRun(key + '::' + it.id, it.tests);
  });

  document.getElementById('lessonPracticeStarter').addEventListener('click', () => {
    const it = list.find(x => x.id === activeId) || list[0];
    if (!confirm('Reset this practice to the starter code?')) return;
    codeEl.value = it.starter;
    const cur = lessonPracticeState();
    delete cur.code[key + '::' + it.id];
    lessonPracticePersist();
    if (resultsEl) resultsEl.innerHTML = `<div class="practice-empty">Starter restored. Run the tests when you're ready.</div>`;
  });
}


function practiceChallenge(id) {
  return PRACTICE_CHALLENGES.find(item => item.id === id) || null;
}

function practiceState() {
  if (state.practice) return state.practice;
  try {
    const saved = JSON.parse(localStorage.getItem(PRACTICE_KEY) || "null");
    if (saved && typeof saved === "object") {
      state.practice = { solved: saved.solved || {}, code: saved.code || {} };
      return state.practice;
    }
  } catch (err) {}
  state.practice = { solved: {}, code: {} };
  return state.practice;
}

function practicePersist() {
  localStorage.setItem(PRACTICE_KEY, JSON.stringify(practiceState()));
}

function practiceCode(challenge) {
  const saved = practiceState().code[challenge.id];
  return typeof saved === "string" ? saved : challenge.starter;
}

function practiceWorkerSource(challenge, code) {
  const cases = JSON.stringify(challenge.tests);
  return `try {
${code}
} catch (error) {
  self.postMessage({ fatal: String(error) });
  self.close();
}
var cases = ${cases};
var results = cases.map(function (test) {
  try {
    return { name: test.name, pass: Boolean(eval(test.check)) };
  } catch (error) {
    return { name: test.name, pass: false, error: String(error) };
  }
});
self.postMessage({ results: results });
`;
}

function practiceStopWorker() {
  if (state.practiceWorker) {
    state.practiceWorker.terminate();
    state.practiceWorker = null;
  }
  if (state.practiceWorkerUrl) {
    URL.revokeObjectURL(state.practiceWorkerUrl);
    state.practiceWorkerUrl = null;
  }
}

function practiceProgress() {
  const st = practiceState();
  const solved = PRACTICE_CHALLENGES.filter(item => st.solved[item.id]).length;
  const el = $("#practiceProgress");
  if (el) el.textContent = `${solved}/${PRACTICE_CHALLENGES.length} solved`;
}

function practiceShowResults(data) {
  clearTimeout(state.practiceTimer);
  const box = $("#practiceResults");
  if (!box) return;
  if (data.fatal) {
    box.innerHTML = `<div class="practice-result-head fail">${icon("refresh")} Your code stopped early</div>
      <p class="practice-empty">${esc(data.fatal)}</p>`;
    return;
  }
  const results = Array.isArray(data.results) ? data.results : [];
  const passed = results.filter(item => item.pass).length;
  const all = results.length > 0 && passed === results.length;
  box.innerHTML = `
    <div class="practice-result-head ${all ? "pass" : "fail"}">${icon(all ? "check" : "refresh")} ${passed}/${results.length} tests passed</div>
    <div class="practice-result-list">
      ${results.map(item => `<div class="practice-result ${item.pass ? "pass" : "fail"}">
        <span class="practice-result-mark">${item.pass ? "✓" : "×"}</span>
        <span><b>${esc(item.name)}</b>${item.error ? `<small>${esc(item.error)}</small>` : ""}</span>
      </div>`).join("")}
    </div>`;
  if (all) {
    const st = practiceState();
    const id = state.practiceRunId;
    if (id) {
      st.solved[id] = true;
      practicePersist();
      practiceProgress();
      const item = document.querySelector(`[data-practice-id="${id}"]`);
      if (item) {
        item.classList.add("solved");
        const mark = item.querySelector(".practice-item-mark");
        if (mark) mark.innerHTML = icon("check");
      }
    }
  }
}

function practiceRun(id) {
  const challenge = practiceChallenge(id);
  const box = $("#practiceResults");
  const codeEl = $("#practiceCode");
  if (!challenge || !box || !codeEl) return;
  const st = practiceState();
  st.code[id] = codeEl.value;
  practicePersist();
  state.practiceRunId = id;
  box.innerHTML = `<div class="practice-running"><span class="spinner"></span> Running ${challenge.tests.length} tests…</div>`;
  clearTimeout(state.practiceTimer);
  practiceStopWorker();
  const blob = new Blob([practiceWorkerSource(challenge, codeEl.value)], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  state.practiceWorker = worker;
  state.practiceWorkerUrl = url;
  const finish = data => {
    clearTimeout(state.practiceTimer);
    practiceStopWorker();
    practiceShowResults(data);
  };
  worker.onmessage = event => finish(event.data || {});
  worker.onerror = event => finish({ fatal: event.message || "Your code could not be started" });
  state.practiceTimer = setTimeout(() => {
    practiceStopWorker();
    const results = $("#practiceResults");
    if (results) {
      results.innerHTML = `<div class="practice-result-head fail">${icon("refresh")} Timed out</div>
        <p class="practice-empty">Your code took too long. Check for an infinite loop and run again.</p>`;
    }
  }, 2000);
}

function renderPractice(id) {
  const challenge = practiceChallenge(id) || PRACTICE_CHALLENGES[0];
  const st = practiceState();
  const solved = Boolean(st.solved[challenge.id]);
  const list = PRACTICE_CHALLENGES.map(item => `
    <a class="practice-item ${item.id === challenge.id ? "active" : ""} ${st.solved[item.id] ? "solved" : ""}" data-practice-id="${attr(item.id)}" href="#/practice/${attr(item.id)}">
      <span class="practice-item-mark">${st.solved[item.id] ? icon("check") : ""}</span>
      <span class="practice-item-copy"><b>${esc(item.title)}</b><small>${esc(item.level)}</small></span>
    </a>`).join("");
  $("#main").innerHTML = `
    <div class="page-head">
      <div><h1>Coding practice</h1><p>Small JavaScript challenges with local tests. Your progress stays in this browser.</p></div>
      <span class="chip indigo" id="practiceProgress"></span>
    </div>
    <div class="practice-shell">
      <aside class="practice-sidebar">
        <div class="practice-side-head"><span>Challenges</span><span class="chip gray">${PRACTICE_CHALLENGES.length}</span></div>
        <div class="practice-list">${list}</div>
        <div class="practice-tip"><b>Practice habits</b><p>Read the tests first, solve in small steps, and run often. Keep the input unchanged unless the prompt asks otherwise.</p></div>
      </aside>
      <section class="practice-workspace">
        <div class="practice-head">
          <div><span class="practice-level">${esc(challenge.level)}</span><h2>${esc(challenge.title)}</h2></div>
          ${solved ? `<span class="chip green">${icon("check")} Solved</span>` : ""}
        </div>
        <p class="practice-prompt">${esc(challenge.prompt)}</p>
        <ul class="practice-requirements">${challenge.requirements.map(item => `<li>${esc(item)}</li>`).join("")}</ul>
        <div class="practice-editor-head">
          <span>${icon("code")} JavaScript</span>
          <div class="practice-editor-tools">
            <button class="btn btn-small" id="practiceHintBtn">Hint</button>
            <button class="btn btn-small" id="practiceResetBtn">${icon("refresh")} Starter</button>
          </div>
        </div>
        <div class="practice-hint" id="practiceHint" hidden>${esc(challenge.hint)}</div>
        <textarea class="practice-code" id="practiceCode" spellcheck="false" aria-label="JavaScript solution">${esc(practiceCode(challenge))}</textarea>
        <div class="practice-actions">
          <button class="btn primary" id="practiceRunBtn">${icon("play")} Run tests</button>
          <span class="practice-saved" id="practiceSaved">Saved locally</span>
        </div>
        <div class="practice-results" id="practiceResults">
          <div class="practice-empty">Run the tests when you are ready.</div>
        </div>
      </section>
    </div>`;
  practiceProgress();
  const codeEl = $("#practiceCode");
  codeEl.addEventListener("input", () => {
    const current = practiceState();
    current.code[challenge.id] = codeEl.value;
    practicePersist();
    const saved = $("#practiceSaved");
    if (saved) saved.textContent = "Saved locally";
  });
  codeEl.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      practiceRun(challenge.id);
    }
  });
  $("#practiceRunBtn").addEventListener("click", () => practiceRun(challenge.id));
  $("#practiceHintBtn").addEventListener("click", () => {
    const hint = $("#practiceHint");
    if (hint) hint.hidden = !hint.hidden;
  });
  $("#practiceResetBtn").addEventListener("click", () => {
    if (!confirm("Reset this challenge to the starter code?")) return;
    const current = practiceState();
    delete current.code[challenge.id];
    practicePersist();
    codeEl.value = challenge.starter;
    const results = $("#practiceResults");
    if (results) results.innerHTML = `<div class="practice-empty">Starter restored. Run the tests when you are ready.</div>`;
  });
}

const PG_KEY = "ccbp.playground.v1";
const PG_DEFAULT = {
  html: `<main class="card">
  <span class="eyebrow">CCBP Playground</span>
  <h1>Hello, <span id="name">coder</span>!</h1>
  <p>Edit HTML, CSS, and JavaScript. The preview updates live.</p>
  <button id="greet">Say hello</button>
</main>`,
  css: `:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: system-ui, sans-serif;
  background: linear-gradient(135deg, #eef2ff, #ecfeff);
  color: #111827;
}
.card {
  width: min(92vw, 520px);
  padding: 32px;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(30, 41, 59, .16);
}
.eyebrow { font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #6366f1; }
h1 { margin: 10px 0 8px; font-size: 38px; line-height: 1.1; }
p { color: #64748b; }
button { margin-top: 14px; padding: 11px 18px; border: 0; border-radius: 12px; background: #4f46e5; color: #fff; font-weight: 700; cursor: pointer; }
button:hover { background: #4338ca; }`,
  js: `const name = document.querySelector("#name");
const btn = document.querySelector("#greet");
const names = ["coder", "builder", "NxtWave", "you"];
let i = 0;

btn.addEventListener("click", () => {
  i = (i + 1) % names.length;
  name.textContent = names[i];
  console.log("Hello,", names[i]);
});

console.log("Playground ready");`
};

function pgDefault() {
  return JSON.parse(JSON.stringify(PG_DEFAULT));
}

function pgLoad() {
  if (state.playground) return state.playground;
  try {
    const saved = JSON.parse(localStorage.getItem(PG_KEY) || "null");
    if (saved && typeof saved.html === "string" && typeof saved.css === "string" && typeof saved.js === "string") {
      state.playground = saved;
      return saved;
    }
  } catch (err) {}
  state.playground = pgDefault();
  return state.playground;
}

function pgReadEditors() {
  const pg = pgLoad();
  $$("[data-pg-lang]").forEach(ta => { pg[ta.dataset.pgLang] = ta.value; });
  return pg;
}

function pgStore(pg, notify) {
  localStorage.setItem(PG_KEY, JSON.stringify(pg));
  if (notify) showToast("Playground saved");
}

function pgDocument(pg) {
  const bridge = `<script>
(function () {
  const send = (type, args) => {
    const clean = args.map(value => {
      if (typeof value === "string") return value;
      if (value === undefined) return "undefined";
      try { return JSON.stringify(value); } catch (err) { return String(value); }
    });
    parent.postMessage({ __ccbpPlayground: true, type, args: clean }, "*");
  };
  ["log", "info", "warn", "error"].forEach(level => {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      original(...args);
      send(level, args);
    };
  });
  window.addEventListener("error", event => send("error", [event.message]));
  window.addEventListener("unhandledrejection", event => send("error", ["Unhandled promise: " + event.reason]));
})();
</script>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${pg.css}</style>
</head>
<body>
${pg.html}
${bridge}
<script>${pg.js}</script>
</body>
</html>`;
}

function pgConsole(type, text) {
  const box = $("#pgConsole");
  if (!box) return;
  const line = document.createElement("div");
  line.className = "pg-console-line " + String(type || "log");
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  const prefix = type && type !== "log" ? String(type).toUpperCase() + ": " : "";
  line.textContent = `[${stamp}] ${prefix}${text}`;
  box.appendChild(line);
  while (box.children.length > 200) box.firstElementChild.remove();
  box.scrollTop = box.scrollHeight;
}

function pgRun() {
  const frame = $("#pgPreview");
  if (!frame) return;
  const pg = pgReadEditors();
  const box = $("#pgConsole");
  if (box) box.innerHTML = "";
  frame.srcdoc = pgDocument(pg);
  pgStore(pg);
}

function renderPlayground() {
  const pg = pgLoad();
  const editors = ["html", "css", "js"].map(lang =>
    `<textarea class="playground-code" data-pg-lang="${lang}" spellcheck="false" aria-label="${lang.toUpperCase()} code"${lang === "html" ? "" : " hidden"}>${esc(pg[lang])}</textarea>`
  ).join("");
  $("#main").innerHTML = `
    <div class="page-head"><div><h1>Playground</h1><p>Write HTML, CSS, and JavaScript with a live preview and console.</p></div></div>
    <div class="playground-shell">
      <section class="playground-editor">
        <div class="playground-toolbar">
          <div class="playground-tabs" role="tablist" aria-label="Editor language">
            ${["html", "css", "js"].map(lang => `<button type="button" class="playground-tab ${lang === "html" ? "active" : ""}" data-pg-tab="${lang}" role="tab">${lang.toUpperCase()}</button>`).join("")}
          </div>
          <div class="playground-actions">
            <button class="btn primary" id="pgRun">${icon("play")} Run</button>
            <button class="btn" id="pgSave">${icon("save")} Save</button>
            <button class="btn" id="pgDownload">${icon("download")} HTML</button>
            <button class="btn" id="pgReset">${icon("refresh")} Reset</button>
          </div>
        </div>
        <div class="playground-editors">${editors}</div>
        <p class="playground-hint">Ctrl/⌘ + Enter to run. Code is saved in this browser.</p>
      </section>
      <section class="playground-output">
        <div class="playground-output-head"><span>${icon("play")} Preview</span><span class="chip">Live</span></div>
        <iframe id="pgPreview" class="playground-frame" sandbox="allow-scripts allow-forms allow-modals allow-popups" title="Playground preview"></iframe>
        <div class="playground-output-head"><span>${icon("terminal")} Console</span><button class="btn btn-small" id="pgClearConsole">Clear</button></div>
        <div class="playground-console" id="pgConsole"></div>
      </section>
    </div>`;
  $$("[data-pg-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      $$("[data-pg-tab]").forEach(item => item.classList.toggle("active", item === btn));
      $$("[data-pg-lang]").forEach(ta => { ta.hidden = ta.dataset.pgLang !== btn.dataset.pgTab; });
    });
  });
  $$("[data-pg-lang]").forEach(ta => {
    ta.addEventListener("input", () => {
      pgReadEditors();
      clearTimeout(state.pgTimer);
      state.pgTimer = setTimeout(pgRun, 450);
    });
    ta.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        pgRun();
      }
    });
  });
  $("#pgRun").addEventListener("click", pgRun);
  $("#pgSave").addEventListener("click", () => pgStore(pgReadEditors(), true));
  $("#pgDownload").addEventListener("click", () => {
    const blob = new Blob([pgDocument(pgReadEditors())], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ccbp-playground.html";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    showToast("Playground HTML downloaded");
  });
  $("#pgReset").addEventListener("click", () => {
    if (!confirm("Reset the playground to the starter example?")) return;
    state.playground = pgDefault();
    $$("[data-pg-lang]").forEach(ta => { ta.value = state.playground[ta.dataset.pgLang]; });
    pgStore(state.playground);
    pgRun();
    showToast("Playground reset");
  });
  $("#pgClearConsole").addEventListener("click", () => {
    const box = $("#pgConsole");
    if (box) box.innerHTML = "";
  });
  pgRun();
}

async function route() {
  closeDrawer();
  if (state.hls) { state.hls.destroy(); state.hls = null; }
  const raw = location.hash.slice(1) || "/";
  const [pathPart, queryPart] = raw.split("?");
  const parts = pathPart.split("/").filter(Boolean);
  const params = new URLSearchParams(queryPart || "");
  const main = $("#main");

  try {
    await ensureBase();
    updateTopCount();
    renderSideCourses();

    if (!parts.length) {
      setActiveNav("#/");
      state.currentCourseId = null;
      await renderHome();
    } else if (parts[0] === "course" && parts[1]) {
      setActiveNav("");
      await renderCourse(parts[1], params);
    } else if (parts[0] === "lesson" && parts[1] && parts[2]) {
      setActiveNav("");
      await renderLesson(parts[1], parts[2], params);
    } else if (parts[0] === "library") {
      setActiveNav("#/library");
      state.currentCourseId = null;
      await renderLibrary();
    } else if (parts[0] === "links") {
      setActiveNav("#/links");
      state.currentCourseId = null;
      await renderLinks();
    } else if (parts[0] === "data") {
      setActiveNav("#/data");
      state.currentCourseId = null;
      await renderData();
    } else if (parts[0] === "playground") {
      setActiveNav("#/playground");
      state.currentCourseId = null;
      renderPlayground();
    } else if (parts[0] === "practice") {
      setActiveNav("#/practice");
      state.currentCourseId = null;
      renderPractice(parts[1] || "");
    } else if (parts[0] === "search") {
      setActiveNav("#/search");
      state.currentCourseId = null;
      await renderSearch(params.get("q") || "");
    } else {
      setActiveNav("");
      state.currentCourseId = null;
      main.innerHTML = `<div class="empty-state"><h2>Page not found</h2><p>The link <code>${esc(location.hash)}</code> does not exist in this clone.</p></div>`;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  } catch (err) {
    console.error(err);
    main.innerHTML = pageError(err.message || String(err));
  }
}

function heroStat(value, label) {
  return `<div class="hero-stat"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;
}

function thumbFor(c) {
  return `thumbs/${c.id}.svg`;
}

function courseCard(c) {
  const pct = Math.round(Number(c.completion || 0));
  const img = ` style="background-image:url('${thumbFor(c)}')"`;
  const locked = c.availability === "LOCKED" ? `<span class="locked-flag">Locked</span>` : "";
  return `<a class="course-card" href="#/course/${attr(c.id)}">
    <div class="course-thumb"${img}>${locked}</div>
    <div class="course-card-body">
      <div class="course-card-top">
        <h3>${esc(c.title)}</h3>
        <span class="ring-wrap"><span class="ring" style="--p:${pct}"><b>${pct}%</b></span></span>
      </div>
      <div class="chips">
        <span class="chip">${fmtNum(c.counts.lessons)} lessons</span>
        <span class="chip purple">${fmtNum(c.counts.videos)} videos</span>
        <span class="chip sky">${fmtNum(c.counts.slides)} slides</span>
      </div>
      <div class="progress-track"><div><i style="width:${pct}%"></i></div></div>
    </div>
  </a>`;
}

function renderCycle(cycle) {
  const courses = state.courses.courses.filter(c => c.cycle === cycle);
  return `<section class="cycle-section">
    <span class="cycle-dot"></span>
    <div class="cycle-head"><h2>${esc(cycle)}</h2><span class="cycle-meta">${courses.length} course${courses.length === 1 ? "" : "s"}</span></div>
    <div class="course-list">${courses.map(courseCard).join("")}</div>
  </section>`;
}

async function renderHome() {
  const counts = state.courses.counts;
  const cycles = [...new Set(state.courses.courses.map(c => c.cycle))];
  $("#main").innerHTML = `
    <section class="hero">
      <div>
        <p class="eyebrow">My Journey</p>
        <h1>Everything you learned, in one place.</h1>
        <p>An offline copy of your CCBP journey — ${fmtNum(counts.lessons)} lessons, ${fmtNum(counts.videos)} video links across ${fmtNum(Object.keys(state.languages).length)} languages, and ${fmtNum(counts.slides)} slide decks.</p>
      </div>
      <div class="hero-stats">
        ${heroStat(fmtNum(counts.courses), "Courses")}
        ${heroStat(fmtNum(counts.lessons), "Lessons")}
        ${heroStat(fmtNum(counts.videos), "Video links")}
        ${heroStat(fmtNum(counts.slides), "Slide decks")}
      </div>
    </section>
    <div class="section-head">
      <div><h2>Growth cycles</h2><p>Your collected courses, grouped by cycle.</p></div>
      <a href="#/library">Browse library</a>
    </div>
    ${cycles.map(renderCycle).join("")}
  `;
}

function renderTopic(topic, index, course, openTopic) {
  const open = openTopic ? topic.id === openTopic : index === 0;
  return `<details class="topic" id="topic-${attr(topic.id)}"${open ? " open" : ""}>
    <summary>
      <span class="topic-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="topic-name">${esc(topic.name)}</span>
      <span class="topic-count">${topic.units.length} units</span>
      ${icon("chevron")}
    </summary>
    <div class="lesson-list">${topic.units.map(unit => renderLessonRow(unit, course, topic)).join("")}</div>
  </details>`;
}

function renderLessonRow(unit, course, topic) {
  const meta = iconForUnit(unit);
  const res = unit.resources && unit.resources[0];
  const langs = res ? res.languages : [];
  const slides = res ? res.slides.length : 0;
  const duration = res && langs.length && res.videos[langs[0]] ? res.videos[langs[0]].duration : unit.duration;
  const badges = [];
  if (langs.length) badges.push(`<span class="chip purple">${langs.length} lang</span>`);
  if (slides) badges.push(`<span class="chip sky">${slides} slide${slides === 1 ? "" : "s"}</span>`);
  if (unit.locked) badges.push(`<span class="chip amber">Locked</span>`);
  const subtitle = langs.length
    ? `${fmtDuration(duration)} · ${langs.length} language${langs.length === 1 ? "" : "s"}`
    : meta.label;
  const inner = `
    <span class="lesson-icon ${meta.cls}">${icon(meta.icon)}</span>
    <span class="lesson-main"><b>${esc(unit.name)}</b><span>${esc(subtitle)}</span></span>
    <span class="lesson-badges">${badges.join("")}</span>
    ${unit.resources.length ? `<span class="lesson-chevron">${icon("chevron")}</span>` : ""}
  `;
  if (!unit.resources.length) return `<div class="lesson-row disabled">${inner}</div>`;
  return `<a class="lesson-row" href="#/lesson/${attr(course.id)}/${attr(unit.id)}">${inner}</a>`;
}

async function renderCourse(id, params) {
  const course = await getCourse(id);
  state.currentCourseId = id;
  setActiveCourse(id);
  const pct = Math.round(Number(course.completion || 0));
  const img = ` style="background-image:url('${thumbFor(course)}')"`;
  const openTopic = params.get("topic") || "";
  $("#main").innerHTML = `
    <a class="back-link" href="#/">${icon("arrowLeft")} My Journey</a>
    <section class="course-hero">
      <div class="course-hero-img"${img}></div>
      <div>
        <div class="course-meta">
          <span class="chip indigo">${esc(course.cycle)}</span>
          <span class="chip ${course.availability === "UNLOCKED" ? "green" : "gray"}">${esc(course.availability === "UNLOCKED" ? "Unlocked" : "Locked")}</span>
          <span class="chip">${pct}% complete</span>
        </div>
        <h1>${esc(course.title)}</h1>
        ${course.outcome ? `<p class="lede">${esc(course.outcome)}</p>` : ""}
        <div class="stat-row">
          <div class="stat"><b>${course.topics.length}</b><span>Topics</span></div>
          <div class="stat"><b>${fmtNum(course.counts.lessons)}</b><span>Lessons</span></div>
          <div class="stat"><b>${fmtNum(course.counts.videos)}</b><span>Video links</span></div>
          <div class="stat"><b>${fmtNum(course.counts.slides)}</b><span>Slide decks</span></div>
        </div>
      </div>
    </section>
    <div class="section-head">
      <div><h2>Course content</h2><p>${course.topics.length} topics · ${fmtNum(course.counts.lessons)} lessons</p></div>
    </div>
    <div class="topic-list">${course.topics.map((topic, index) => renderTopic(topic, index, course, openTopic)).join("")}</div>
  `;
}

function isYouTubeId(url) {
  return /^[A-Za-z0-9_-]{11}$/.test(String(url || ""));
}

function nextVideoLesson(course, unitId, lang) {
  const units = (course.topics || []).flatMap(topic => topic.units || []);
  const start = units.findIndex(unit => unit.id === unitId);
  if (start < 0) return null;
  for (let i = start + 1; i < units.length; i++) {
    const unit = units[i];
    const res = (unit.resources || [])[0];
    if (!res || res.type !== "INTERACTIVE_VIDEO") continue;
    const langs = res.languages || [];
    if (!langs.length) continue;
    const nextLang = langs.includes(lang) ? lang : (langs.includes("en") ? "en" : langs[0]);
    return { unit, lang: nextLang, href: `#/lesson/${course.id}/${unit.id}?lang=${nextLang}` };
  }
  return null;
}

function renderPlayerCard(course, topic, unit, res, lang) {
  const video = res.videos[lang];
  const nextLesson = nextVideoLesson(course, unit.id, lang);
  const youtube = video && isYouTubeId(video.url);
  const buttons = res.languages.map(code =>
    `<button class="lang-btn ${code === lang ? "active" : ""}" data-lang="${attr(code)}">${esc(langLabel(code))}</button>`
  ).join("");
  const downloadName = `${course.title} - ${unit.name} - ${langLabel(lang)}.mp4`;
  const downloadHref = video && !youtube ? videoDownloadHref(video.url, downloadName) : "#";
  const openUrl = youtube ? `https://www.youtube.com/watch?v=${video.url}` : (video && video.url || "#");
  const embedUrl = youtube ? `https://www.youtube.com/embed/${video.url}?rel=0` : "";
  return `<div class="player-card">
    <div class="video-shell">
      ${youtube
        ? `<iframe id="lessonFrame" class="youtube-frame" src="${attr(embedUrl)}" title="${attr(unit.name)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
        : `<video id="lessonVideo" controls playsinline preload="metadata"></video>
      <div class="video-placeholder" id="videoPlaceholder">Loading stream…</div>`}
      <button class="fs-btn" id="fsBtn" type="button" aria-label="Fullscreen" title="Fullscreen">${icon("expand")}</button>
    </div>
    <div class="player-body">
      <div class="player-title-row">
        <div>
          <h2>${esc(unit.name)}</h2>
          <p>${esc(topic.name)} · <span id="playerDuration">${fmtDuration(video && video.duration)}</span></p>
        </div>
        <span class="chip purple">${youtube ? "YouTube" : "HLS"}</span>
      </div>
      <div class="lang-row" id="langRow">${buttons}</div>
      <div class="player-actions">
        ${video && !youtube ? `<a class="btn primary" id="downloadVideoBtn" href="${attr(downloadHref)}" download="${attr(downloadName)}">${icon("download")} Download MP4</a>` : ""}
        ${!youtube ? `<button class="btn" id="copyStreamBtn" data-copy-url="${attr(video && video.url)}">${icon("copy")} Copy HLS link</button>` : ""}
        <a class="btn" id="openStreamBtn" href="${attr(openUrl)}" target="_blank" rel="noopener">${icon("external")} ${youtube ? "Open on YouTube" : "Open stream"}</a>
        ${nextLesson ? `<a class="btn" id="nextVideoBtn" href="${attr(nextLesson.href)}" title="${attr(nextLesson.unit.name)}">${icon("arrowRight")} Next video</a>` : ""}
        ${res.slides.length ? `<button class="btn" data-tab-jump="slides">${icon("file")} Slides</button>` : ""}
      </div>
      ${video ? `<p class="download-note">${youtube ? "This lesson is hosted on YouTube." : "MP4 is remuxed from the HLS stream on demand. Use Copy HLS link if your player needs the playlist."}</p>` : ""}
    </div>
  </div>`;
}

function renderSlidesPanel(slides, title) {
  if (!slides.length) return `<div class="panel-card"><div class="slide-empty">No slides collected for this lesson.</div></div>`;
  const name = `${title} - slides.pdf`;
  return `<div class="panel-card">
    <div class="slide-frame"><iframe src="${attr(slides[0].url)}" loading="lazy" allowfullscreen title="Lesson slides"></iframe></div>
    <div class="player-actions">
      <a class="btn primary" href="${attr(slides[0].url)}" target="_blank" rel="noopener">${icon("external")} Open in Google Slides</a>
      <button class="btn" id="downloadSlidesBtn" data-download-slides="${attr(slidesDownloadHref(slides[0].url, name))}" data-download-name="${attr(name)}">${icon("download")} Download PDF</button>
    </div>
    <p class="download-note">PDF is rendered on demand from the published deck; large decks can take several minutes.</p>
  </div>`;
}

function renderTabs(tabs, activeTab, slides, title, practiceHtml) {
  if (!tabs.length) return "";
  return `<div class="tabs" id="lessonTabs">
    ${tabs.map(tab => `<button class="tab-btn ${tab.id === activeTab ? "active" : ""}" data-tab="${attr(tab.id)}">${esc(tab.label)}</button>`).join("")}
  </div>
  <div class="tab-panels">
    ${tabs.map(tab => `<div class="tab-panel" data-panel="${attr(tab.id)}"${tab.id === activeTab ? "" : " hidden"}>
      ${tab.id === "slides" ? renderSlidesPanel(slides, title) : tab.id === "practice" ? (practiceHtml || "") : `<div class="panel-card markdown" id="markdownBody"></div>`}
    </div>`).join("")}
  </div>`;
}

function renderRail(course, topic, unit) {
  const siblings = topic.units.filter(item => item.resources.length);
  const res = unit.resources[0];
  return `<aside class="rail">
    <div class="rail-card">
      <h3>In this topic</h3>
      <div class="rail-list">
        ${siblings.map(item => `<a class="rail-item ${item.id === unit.id ? "active" : ""}" href="#/lesson/${attr(course.id)}/${attr(item.id)}"><span class="dot"></span><span>${esc(item.name)}</span></a>`).join("")}
      </div>
    </div>
    <div class="rail-card">
      <h3>Collected data</h3>
      <div class="rail-meta">
        <span class="chip purple">${res && res.languages.length ? `${res.languages.length} languages` : "No video"}</span>
        <span class="chip sky">${res ? res.slides.length : 0} slides</span>
        <span class="chip">${res && res.content ? "Notes" : "No notes"}</span>
      </div>
      <p style="margin:10px 0 0;color:var(--muted);font-size:11.5px">Resource <code>${esc(res ? res.id : "—")}</code></p>
    </div>
  </aside>`;
}

function activateTab(id) {
  $$(".tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === id));
  $$(".tab-panel").forEach(panel => { panel.hidden = panel.dataset.panel !== id; });
}

function syncFsButtons() {
  $$(".video-shell").forEach(shell => {
    const btn = $(".fs-btn", shell);
    if (!btn) return;
    const active = document.fullscreenElement === shell
      || shell.classList.contains("video-pseudo-fs")
      || (document.fullscreenElement && document.fullscreenElement.tagName === "VIDEO");
    btn.classList.toggle("is-fs", !!active);
    btn.innerHTML = icon(active ? "collapse" : "expand");
    btn.setAttribute("aria-label", active ? "Exit fullscreen" : "Fullscreen");
    btn.title = active ? "Exit fullscreen" : "Fullscreen";
  });
}

function exitPseudoFullscreen() {
  $$(".video-shell.video-pseudo-fs").forEach(shell => shell.classList.remove("video-pseudo-fs"));
  document.documentElement.classList.remove("fs-lock");
  syncFsButtons();
}

async function togglePlayerFullscreen(shell) {
  if (!shell) return;
  const video = $("#lessonVideo", shell);
  if (document.fullscreenElement) {
    try { await document.exitFullscreen(); } catch (err) { /* already gone */ }
    return;
  }
  if (shell.classList.contains("video-pseudo-fs")) {
    exitPseudoFullscreen();
    return;
  }
  try {
    if (shell.requestFullscreen) await shell.requestFullscreen();
    else if (shell.webkitRequestFullscreen) shell.webkitRequestFullscreen();
    else if (video && video.webkitEnterFullscreen) { video.webkitEnterFullscreen(); return; }
    else throw new Error("fullscreen unavailable");
  } catch (err) {
    shell.classList.add("video-pseudo-fs");
    document.documentElement.classList.add("fs-lock");
  }
  syncFsButtons();
}

function bindPlayerFullscreen() {
  const shell = $(".video-shell");
  const btn = $("#fsBtn");
  if (!shell || !btn) return;
  btn.addEventListener("click", () => togglePlayerFullscreen(shell));
  shell.addEventListener("dblclick", e => {
    if (e.target.tagName === "VIDEO") {
      e.preventDefault();
      togglePlayerFullscreen(shell);
    }
  });
}

function bindPlayerFullscreenEvents() {
  document.addEventListener("fullscreenchange", syncFsButtons);
  document.addEventListener("webkitfullscreenchange", syncFsButtons);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && $(".video-shell.video-pseudo-fs")) exitPseudoFullscreen();
  });
}

function attachStream(video, url) {
  if (!video || !url) return;
  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }
  video.pause();
  video.removeAttribute("src");
  video.load();
  const placeholder = $("#videoPlaceholder");
  if (placeholder) {
    placeholder.hidden = false;
    placeholder.textContent = "Loading stream…";
  }
  const ready = () => { if (placeholder) placeholder.hidden = true; };
  video.addEventListener("loadedmetadata", ready, { once: true });
  video.addEventListener("canplay", ready, { once: true });
  if (window.Hls && Hls.isSupported()) {
    const hls = new Hls({ enableWorker: true });
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data.fatal) return;
      if (placeholder) {
        placeholder.hidden = false;
        placeholder.textContent = "Stream error — use Open stream";
      }
    });
    state.hls = hls;
  } else {
    video.src = url;
  }
}

function renderMarkdownInto(el, content) {
  const cleaned = String(content || "").replace(/<\/?WebCodePlayground>/gi, "");
  if (window.marked) {
    el.innerHTML = marked.parse(cleaned, { gfm: true, breaks: false });
  } else {
    el.innerHTML = esc(cleaned).replace(/\n/g, "<br>");
  }
  $$("pre", el).forEach(pre => {
    if (pre.querySelector(".copy-code")) return;
    const text = pre.querySelector("code") ? pre.querySelector("code").innerText : pre.innerText;
    const btn = document.createElement("button");
    btn.className = "copy-code";
    btn.textContent = "Copy";
    btn.addEventListener("click", () => copyText(text));
    pre.appendChild(btn);
  });
}

async function renderLesson(courseId, unitId, params) {
  const course = await getCourse(courseId);
  state.currentCourseId = courseId;
  setActiveCourse(courseId);
  let topic = null;
  let unit = null;
  for (const t of course.topics) {
    const found = t.units.find(u => u.id === unitId);
    if (found) { topic = t; unit = found; break; }
  }
  if (!topic || !unit) {
    $("#main").innerHTML = `<div class="empty-state"><h2>Lesson not found</h2><p>This lesson is not in the collected data.</p></div>`;
    return;
  }
  const res = unit.resources[0] || null;
  const langs = res ? res.languages : [];
  const requested = params.get("lang") || state.prefLang;
  const lang = langs.includes(requested) ? requested : (langs.includes("en") ? "en" : (langs[0] || ""));
  const isVideo = !!(res && res.type === "INTERACTIVE_VIDEO" && langs.length);
  const youtube = !!(isVideo && res.videos[lang] && isYouTubeId(res.videos[lang].url));
  const slides = res ? res.slides : [];
  const content = res ? res.content : "";
  const meta = iconForUnit(unit);
  const tabs = [];
  if (slides.length) tabs.push({ id: "slides", label: `Slides${slides.length > 1 ? ` (${slides.length})` : ""}` });
  if ((content || "").trim()) tabs.push({ id: "notes", label: "Notes" });
  tabs.push({ id: "practice", label: "Practice" });
  const defaultTab = (content || "").trim() ? "notes" : (slides.length ? "slides" : "practice");
  const activeTab = tabs.some(tab => tab.id === defaultTab) ? defaultTab : (tabs[0] && tabs[0].id);
  const lessonPracticeHtml = renderLessonPractice(course, topic, unit);

  const videoDuration = isVideo && res.videos[lang] ? res.videos[lang].duration : unit.duration;
  const headChips = [
    `<span class="chip indigo">${esc(topic.name)}</span>`,
    `<span class="chip">${esc(meta.label)}</span>`,
    isVideo ? `<span class="chip purple">${langs.length} languages</span>` : "",
    slides.length ? `<span class="chip sky">${slides.length} slide${slides.length === 1 ? "" : "s"}</span>` : ""
  ].filter(Boolean).join("");

  $("#main").innerHTML = `
    <a class="back-link" href="#/course/${attr(course.id)}">${icon("arrowLeft")} ${esc(course.title)}</a>
    <div class="lesson-head">
      <div class="lesson-sub">${headChips}</div>
      <h1>${esc(unit.name)}</h1>
      <div class="lesson-sub">
        <span class="chip">${icon("clock")} ${fmtDuration(videoDuration)}</span>
        ${unit.locked ? `<span class="chip amber">Locked unit</span>` : ""}
        ${res ? `<span class="chip">${esc(res.type === "INTERACTIVE_VIDEO" ? "Interactive video" : "Reading material")}</span>` : ""}
      </div>
    </div>
    <div class="lesson-layout">
      <div class="lesson-main-col">
        ${isVideo ? renderPlayerCard(course, topic, unit, res, lang) : ""}
        ${renderTabs(tabs, activeTab, slides, unit.name, lessonPracticeHtml)}
        ${!isVideo && !tabs.length ? `<div class="empty-state"><h2>No content collected</h2><p>This unit is a ${esc(meta.label.toLowerCase())} unit. It has no video, slides, or reading material in the collected data.</p></div>` : ""}
      </div>
      ${renderRail(course, topic, unit)}
    </div>
  `;

  if (isVideo) {
    bindPlayerFullscreen();
    const video = $("#lessonVideo");
    if (video && !youtube && res.videos[lang]) attachStream(video, res.videos[lang].url);
    $$(".lang-btn[data-lang]").forEach(btn => {
      btn.addEventListener("click", () => {
        const nextLang = btn.dataset.lang;
        const next = res.videos[nextLang];
        if (!next) return;
        const nextYouTube = isYouTubeId(next.url);
        if (nextYouTube) {
          const frame = $("#lessonFrame");
          if (frame) frame.src = `https://www.youtube.com/embed/${next.url}?rel=0`;
        } else if (video) {
          attachStream(video, next.url);
        }
        $$(".lang-btn[data-lang]").forEach(item => item.classList.toggle("active", item.dataset.lang === nextLang));
        const copyBtn = $("#copyStreamBtn");
        if (copyBtn) copyBtn.dataset.copyUrl = next.url;
        const openBtn = $("#openStreamBtn");
        if (openBtn) openBtn.href = nextYouTube ? `https://www.youtube.com/watch?v=${next.url}` : next.url;
        const downloadBtn = $("#downloadVideoBtn");
        if (downloadBtn && !nextYouTube) {
          const downloadName = `${course.title} - ${unit.name} - ${langLabel(nextLang)}.mp4`;
          downloadBtn.href = videoDownloadHref(next.url, downloadName);
          downloadBtn.setAttribute("download", downloadName);
        }
        const duration = $("#playerDuration");
        if (duration) duration.textContent = fmtDuration(next.duration);
        history.replaceState(null, "", `#/lesson/${course.id}/${unit.id}?lang=${nextLang}`);
      });
    });
  }
  if ($("#markdownBody")) renderMarkdownInto($("#markdownBody"), content);
  bindLessonPractice(course, topic, unit);
  $$(".tab-btn").forEach(btn => btn.addEventListener("click", () => activateTab(btn.dataset.tab)));
  $$("[data-tab-jump]").forEach(btn => btn.addEventListener("click", () => activateTab(btn.dataset.tabJump)));
}

function dataCard(title, description, href, label) {
  return `<div class="data-card">
    <h3>${esc(title)}</h3>
    <p>${esc(description)}</p>
    <a class="btn primary" href="${attr(href)}" download>${icon("download")} ${esc(label)}</a>
  </div>`;
}

async function renderData() {
  const counts = state.courses.counts;
  $("#main").innerHTML = `
    <div class="page-head">
      <div><h1>Downloads</h1><p>Every collected video link, slide deck, lesson, and the raw database.</p></div>
    </div>
    <div class="note">HLS links are master playlists. Open them in a player that supports HLS, or use them with ffmpeg. Slide links open the published Google Slides deck. For one lesson, open it and use Download MP4 or Download PDF. Not every older lesson has a published deck; the missing-slides list is included below.</div>
    <div class="section-head"><div><h2>What was collected</h2><p>${fmtNum(counts.courses)} courses · ${fmtNum(counts.topics)} topics · ${fmtNum(counts.lessons)} lessons · ${fmtNum(counts.videos)} video links · ${fmtNum(counts.slides)} slide decks</p></div></div>
    <div class="data-grid">
      ${dataCard("All video links", `${fmtNum(counts.videos)} rows with course, topic, lesson, language, HLS URL, and duration.`, "downloads/ccbp_videos_full.csv", "Download CSV")}
      ${dataCard("All slide decks", `${fmtNum(counts.slides)} rows with course, topic, lesson, and the published Google Slides URL.`, "downloads/ccbp_slides_full.csv", "Download CSV")}
      ${dataCard("Lesson coverage", `${fmtNum(counts.lessons)} lessons with language count, video count, slide count, and content type.`, "downloads/ccbp_lessons_full.csv", "Download CSV")}
      ${dataCard("SQLite database", "Normalized courses, topics, units, resources, videos, slides, references, and multimedia.", "downloads/ccbp.db", "Download DB")}
      ${dataCard("Video lessons without slides", "Video lessons that have no published Google Slides deck, mostly onboarding and older foundation lessons.", "downloads/ccbp_video_lessons_without_slides.csv", "Download CSV")}
    </div>
    <div class="section-head"><div><h2>Quick copy</h2><p>Grab every HLS URL in one go.</p></div></div>
    <div class="data-card">
      <h3>Copy all video URLs</h3>
      <p>Loads the full list and copies ${fmtNum(counts.videos)} HLS links, one per line.</p>
      <button class="btn primary" id="copyAllVideos">${icon("copy")} Copy all links</button>
    </div>
  `;
  const btn = $("#copyAllVideos");
  if (btn) {
    btn.addEventListener("click", async () => {
      try {
        if (!state.allVideos) state.allVideos = await loadJSON("all_videos.json");
        await copyText(state.allVideos.map(row => row.url_hls).join("\n"));
      } catch (err) {
        showToast("Could not load video list");
      }
    });
  }
}

function libraryCard(item) {
  const langs = Object.keys(item.languages || {});
  const firstUrl = langs.length ? item.languages[langs[0]] : "";
  const typeLabel = langs.length ? `${langs.length} languages` : (item.slides.length ? "Slides" : "Reading");
  return `<article class="lib-card">
    <div class="lib-card-top">
      <div><h3>${esc(item.lesson)}</h3><p>${esc(item.course)} · ${esc(item.topic)}</p></div>
      <span class="chip ${langs.length ? "purple" : "sky"}">${esc(typeLabel)}</span>
    </div>
    <div class="lang-row">
      ${langs.map(code => `<a class="lang-btn" href="#/lesson/${attr(item.course_id)}/${attr(item.unit_id)}?lang=${attr(code)}">${esc(langLabel(code))}</a>`).join("")}
    </div>
    <div class="lib-actions">
      <a class="btn" href="#/lesson/${attr(item.course_id)}/${attr(item.unit_id)}">${icon("play")} Open lesson</a>
      ${item.slides.length ? `<a class="btn" href="${attr(item.slides[0].slide_url)}" target="_blank" rel="noopener">${icon("file")} Slides</a>` : ""}
      ${firstUrl ? `<button class="btn" data-copy-url="${attr(firstUrl)}">${icon("copy")} Copy link</button>` : ""}
    </div>
  </article>`;
}

function filterLibrary() {
  const f = state.libFilters;
  const q = f.q.trim().toLowerCase();
  const courseOrder = new Map(state.courses.courses.map((course, index) => [course.title, index]));
  return state.library.filter(item => {
    if (f.course && item.course_id !== f.course) return false;
    if (f.lang && !(item.languages && item.languages[f.lang])) return false;
    if (f.kind === "video" && !(item.languages && Object.keys(item.languages).length)) return false;
    if (f.kind === "reading" && item.rtype !== "DEFAULT") return false;
    if (f.kind === "slides" && !(item.slides && item.slides.length)) return false;
    if (!q) return true;
    return `${item.course} ${item.topic} ${item.lesson}`.toLowerCase().includes(q);
  }).sort((a, b) => {
    const order = (courseOrder.get(a.course) ?? 99) - (courseOrder.get(b.course) ?? 99);
    return order || a.lesson.localeCompare(b.lesson);
  });
}

function renderLibraryList() {
  const list = filterLibrary();
  const shown = list.slice(0, state.libLimit);
  const box = $("#libList");
  const count = $("#libCount");
  const more = $("#libMore");
  if (!box) return;
  box.innerHTML = shown.length
    ? shown.map(libraryCard).join("")
    : `<div class="empty-state"><h2>No matches</h2><p>Try a different search, course, language, or content type.</p></div>`;
  if (count) count.textContent = `${fmtNum(shown.length)} of ${fmtNum(list.length)} resources`;
  if (more) {
    more.innerHTML = list.length > shown.length
      ? `<button class="btn primary" id="libMoreBtn">Load more</button>`
      : "";
    const btn = $("#libMoreBtn");
    if (btn) btn.addEventListener("click", () => { state.libLimit += 60; renderLibraryList(); });
  }
}

async function renderLibrary() {
  if (!state.library) state.library = await loadJSON("library.json");
  const courseOptions = state.courses.courses.map(c => `<option value="${attr(c.id)}">${esc(c.title)}</option>`).join("");
  const langOptions = LANG_ORDER.filter(code => state.languages[code]).map(code => `<option value="${attr(code)}">${esc(langLabel(code))}</option>`).join("");
  $("#main").innerHTML = `
    <div class="page-head"><div><h1>Library</h1><p>Every collected lesson, video language, and slide deck in one searchable list.</p></div></div>
    <div class="filter-bar">
      <input class="input" id="libSearch" placeholder="Search lessons, topics, courses" value="${attr(state.libFilters.q)}">
      <select class="filter-select" id="libCourse"><option value="">All courses</option>${courseOptions}</select>
      <select class="filter-select" id="libLang"><option value="">All languages</option>${langOptions}</select>
      <select class="filter-select" id="libKind">
        <option value="">All content</option>
        <option value="video">Video lessons</option>
        <option value="slides">With slides</option>
        <option value="reading">Reading / cheat sheets</option>
      </select>
    </div>
    <div class="section-head" style="margin-top:0"><div><h2>Resources</h2><p id="libCount"></p></div></div>
    <div class="lib-list" id="libList"></div>
    <div class="pager" id="libMore"></div>
  `;
  $("#libSearch").value = state.libFilters.q;
  $("#libCourse").value = state.libFilters.course;
  $("#libLang").value = state.libFilters.lang;
  $("#libKind").value = state.libFilters.kind;
  $("#libSearch").addEventListener("input", e => { state.libFilters.q = e.target.value; state.libLimit = 60; renderLibraryList(); });
  $("#libCourse").addEventListener("change", e => { state.libFilters.course = e.target.value; state.libLimit = 60; renderLibraryList(); });
  $("#libLang").addEventListener("change", e => { state.libFilters.lang = e.target.value; state.libLimit = 60; renderLibraryList(); });
  $("#libKind").addEventListener("change", e => { state.libFilters.kind = e.target.value; state.libLimit = 60; renderLibraryList(); });
  renderLibraryList();
}

function filterLinks() {
  const f = state.linkFilters;
  const q = f.q.trim().toLowerCase();
  return state.allVideos.filter(row => {
    if (f.course && row.course !== f.course) return false;
    if (f.lang && row.language !== f.lang) return false;
    if (!q) return true;
    return `${row.course} ${row.topic} ${row.lesson}`.toLowerCase().includes(q);
  });
}

function renderLinksTable() {
  const courseOrder = new Map(state.courses.courses.map((course, index) => [course.title, index]));
  const langOrder = code => { const index = LANG_ORDER.indexOf(code); return index < 0 ? 99 : index; };
  const list = filterLinks().slice().sort((a, b) => {
    const course = (courseOrder.get(a.course) ?? 99) - (courseOrder.get(b.course) ?? 99);
    if (course) return course;
    const lesson = a.lesson.localeCompare(b.lesson);
    return lesson || langOrder(a.language) - langOrder(b.language);
  });
  const shown = list.slice(0, state.linksLimit);
  const body = $("#linksBody");
  const count = $("#linksCount");
  const more = $("#linksMore");
  if (!body) return;
  body.innerHTML = shown.map(row => `<tr>
    <td><b>${esc(row.course)}</b><div style="color:var(--muted);font-size:10.5px;margin-top:2px">${esc(row.topic)}</div></td>
    <td>${esc(row.lesson)}</td>
    <td><span class="chip purple">${esc(langLabel(row.language))}</span></td>
    <td class="url-cell"><code title="${attr(row.url_hls)}">${esc(row.url_hls)}</code></td>
    <td><div class="row-actions">
      <button class="btn" data-copy-url="${attr(row.url_hls)}">Copy</button>
      <a class="btn" href="${attr(row.url_hls)}" target="_blank" rel="noopener">Open</a>
    </div></td>
  </tr>`).join("");
  if (count) count.textContent = `${fmtNum(shown.length)} of ${fmtNum(list.length)} video links`;
  if (more) {
    more.innerHTML = list.length > shown.length ? `<button class="btn primary" id="linksMoreBtn">Load more</button>` : "";
    const btn = $("#linksMoreBtn");
    if (btn) btn.addEventListener("click", () => { state.linksLimit += 100; renderLinksTable(); });
  }
}

async function renderLinks() {
  if (!state.allVideos) state.allVideos = await loadJSON("all_videos.json");
  const courseOptions = state.courses.courses.map(c => `<option value="${attr(c.title)}">${esc(c.title)}</option>`).join("");
  const langOptions = LANG_ORDER.filter(code => state.languages[code]).map(code => `<option value="${attr(code)}">${esc(langLabel(code))}</option>`).join("");
  $("#main").innerHTML = `
    <div class="page-head"><div><h1>All video links</h1><p>${fmtNum(state.courses.counts.videos)} HLS links across ${fmtNum(state.courses.counts.lessons)} lessons and ${fmtNum(Object.keys(state.languages).length)} languages.</p></div></div>
    <div class="filter-bar">
      <input class="input" id="linksSearch" placeholder="Search course, topic, lesson" value="${attr(state.linkFilters.q)}">
      <select class="filter-select" id="linksCourse"><option value="">All courses</option>${courseOptions}</select>
      <select class="filter-select" id="linksLang"><option value="">All languages</option>${langOptions}</select>
      <div></div>
    </div>
    <div class="section-head" style="margin-top:0"><div><h2>Links</h2><p id="linksCount"></p></div></div>
    <div class="table-wrap">
      <table class="links-table">
        <thead><tr><th>Course</th><th>Lesson</th><th>Language</th><th>HLS URL</th><th></th></tr></thead>
        <tbody id="linksBody"></tbody>
      </table>
    </div>
    <div class="pager" id="linksMore"></div>
  `;
  $("#linksSearch").value = state.linkFilters.q;
  $("#linksCourse").value = state.linkFilters.course;
  $("#linksLang").value = state.linkFilters.lang;
  $("#linksSearch").addEventListener("input", e => { state.linkFilters.q = e.target.value; state.linksLimit = 100; renderLinksTable(); });
  $("#linksCourse").addEventListener("change", e => { state.linkFilters.course = e.target.value; state.linksLimit = 100; renderLinksTable(); });
  $("#linksLang").addEventListener("change", e => { state.linkFilters.lang = e.target.value; state.linksLimit = 100; renderLinksTable(); });
  renderLinksTable();
}

function searchResultLink(item) {
  if (item.kind === "course") return `#/course/${attr(item.course_id)}`;
  if (item.kind === "topic") return `#/course/${attr(item.course_id)}?topic=${attr(item.topic_id)}`;
  return `#/lesson/${attr(item.course_id)}/${attr(item.unit_id)}`;
}

function renderSearchResults(q) {
  const box = $("#searchResults");
  if (!box) return;
  const query = q.trim().toLowerCase();
  if (!query) {
    box.innerHTML = `<div class="empty-state"><h2>Search the collected journey</h2><p>Type a course, topic, or lesson name. Try “React”, “HTML”, “SQL”, or “Python”.</p></div>`;
    return;
  }
  const results = state.search.filter(item => `${item.name} ${item.course || ""} ${item.topic || ""}`.toLowerCase().includes(query)).slice(0, 120);
  box.innerHTML = results.length
    ? results.map(item => `<a class="search-result" href="${searchResultLink(item)}">
        <span class="kind">${esc(item.kind)}</span>
        <span><b>${esc(item.name)}</b><span>${esc(item.kind === "course" ? "Course" : `${item.course || ""}${item.topic ? ` · ${item.topic}` : ""}`)}</span></span>
      </a>`).join("")
    : `<div class="empty-state"><h2>No matches</h2><p>Try a shorter query or a different spelling.</p></div>`;
}

async function renderSearch(q) {
  if (!state.search) state.search = await loadJSON("search.json");
  $("#main").innerHTML = `
    <div class="page-head"><div><h1>Search</h1><p>Courses, topics, and lessons across the whole clone.</p></div></div>
    <div class="search-page">
      <form id="searchPageForm"><input class="input" id="searchPageInput" type="search" placeholder="Search the collected journey" value="${attr(q)}"></form>
      <div class="search-results" id="searchResults"></div>
    </div>
  `;
  const input = $("#searchPageInput");
  input.addEventListener("input", () => renderSearchResults(input.value));
  $("#searchPageForm").addEventListener("submit", e => {
    e.preventDefault();
    location.hash = `#/search?q=${encodeURIComponent(input.value.trim())}`;
  });
  renderSearchResults(q);
}

function bindGlobalEvents() {
  $("#menuBtn").addEventListener("click", () => {
    if (document.body.classList.contains("drawer-open")) closeDrawer();
    else openDrawer();
  });
  $("#drawerBackdrop").addEventListener("click", closeDrawer);
  $("#searchForm").addEventListener("submit", e => {
    e.preventDefault();
    const q = $("#globalSearch").value.trim();
    location.hash = `#/search?q=${encodeURIComponent(q)}`;
  });
  document.addEventListener("click", e => {
    const slidesEl = e.target.closest("[data-download-slides]");
    if (slidesEl) {
      e.preventDefault();
      downloadSlidesPdf(slidesEl);
      return;
    }
    const copyEl = e.target.closest("[data-copy-url]");
    if (copyEl) {
      e.preventDefault();
      copyText(copyEl.dataset.copyUrl);
      return;
    }
    if (e.target.closest(".sidebar a")) closeDrawer();
  });
  window.addEventListener("hashchange", route);
  window.addEventListener("message", event => {
    const data = event.data;
    if (!data || data.__ccbpPlayground !== true) return;
    const frame = $("#pgPreview");
    if (!frame || event.source !== frame.contentWindow) return;
    pgConsole(data.type || "log", (data.args || []).join(" "));
  });
  bindPlayerFullscreenEvents();
}

async function init() {
  bindGlobalEvents();
  try {
    await ensureBase();
    buildPrefLang();
    renderSideCourses();
    updateTopCount();
    await route();
  } catch (err) {
    console.error(err);
    $("#main").innerHTML = pageError(err.message || String(err));
  }
}

init();
