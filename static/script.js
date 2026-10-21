```javascript
const API_URL = "";

const grid = document.getElementById("movieGrid");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const languageFilter = document.getElementById("languageFilter");
const filterChips = document.getElementById("filterChips");
const resultsLabel = document.getElementById("resultsLabel");
const emptyState = document.getElementById("emptyState");

let allMovies = [];
let activeLanguage = "";
let searchText = "";

const palettes = [
    ["#735037", "#171e2b"], ["#6e3036", "#201924"],
    ["#46645c", "#19242b"], ["#514477", "#1c1b2c"],
    ["#966b3c", "#29212a"], ["#355c70", "#171b2c"],
    ["#805147", "#20202b"], ["#4c5d70", "#191b25"]
];

function paletteFor(movie) {
    const text = String(movie.name || "C").toLowerCase();
    const score = [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return palettes[score % palettes.length];
}

function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function posterMarkup(movie) {
    const [a, b] = paletteFor(movie);
    const name = safeText(movie.name || "Cinema");
    const language = safeText(movie.language || "Movie");
    const posterUrl = movie.poster_url;

    return `
        <div class="poster" style="--poster-a:${a};--poster-b:${b}">
            <div class="poster-copy">
                <small>CINEBOOK ORIGINALS</small>
                <strong>${name}</strong>
                <span>${language.toUpperCase()}</span>
            </div>
            ${posterUrl
                ? `<img src="${safeText(posterUrl)}" alt="${name} poster" loading="lazy" onerror="this.remove()">`
                : ""}
            <span class="poster-rating">★ <b>${Number(movie.rating || 0).toFixed(1)}</b></span>
        </div>`;
}

function movieCard(movie) {
    return `
        <article class="movie-card">
            ${posterMarkup(movie)}
            <div class="movie-info">
                <h3 title="${safeText(movie.name)}">${safeText(movie.name)}</h3>
                <div class="movie-meta">
                    <span class="movie-language">${safeText(movie.language)}</span>
                    <span>${movie.duration
                        ? `${safeText(movie.duration)} min`
                        : "Feature film"}</span>
                </div>
                <button class="movie-book" data-movie-id="${Number(movie.movie_id)}">
                    Explore movie ↗
                </button>
            </div>
        </article>`;
}

function renderMiniGrid(id, movies) {
    const target = document.getElementById(id);
    if (!target) return;

    target.innerHTML = movies.length
        ? movies.slice(0, 4).map(movie => {
            const [a, b] = paletteFor(movie);

            return `
                <article class="mini-card" data-mini-movie="${Number(movie.movie_id)}">
                    <div class="mini-poster" style="--poster-a:${a};--poster-b:${b}">
                        ${safeText(String(movie.name || "C").slice(0, 1))}
                    </div>
                    <div>
                        <h3>${safeText(movie.name)}</h3>
                        <p>${safeText(movie.language)} · ${safeText(movie.duration)} min</p>
                        <span>★ ${Number(movie.rating || 0).toFixed(1)} rating</span>
                    </div>
                </article>`;
        }).join("")
        : `<p class="muted">More movies coming soon.</p>`;
}

function renderSpotlights(movies) {
    renderMiniGrid(
        "tamilGrid",
        movies.filter(m => m.language?.toLowerCase() === "tamil")
    );

    renderMiniGrid(
        "teluguGrid",
        movies.filter(m => m.language?.toLowerCase() === "telugu")
    );

    renderMiniGrid(
        "hindiGrid",
        movies.filter(m => m.language?.toLowerCase() === "hindi")
    );

    renderMiniGrid(
        "internationalGrid",
        movies.filter(m => String(m.is_international).toUpperCase() === "Y")
    );
}

function renderMovies() {
    if (!grid || !emptyState || !resultsLabel) return;

    const filtered = allMovies.filter(movie => {
        const matchesSearch =
            `${movie.name || ""} ${movie.language || ""} ${movie.genre || ""}`
                .toLowerCase()
                .includes(searchText.toLowerCase());

        const matchesLanguage = !activeLanguage ||
            (activeLanguage === "international"
                ? String(movie.is_international).toUpperCase() === "Y"
                : movie.language?.toLowerCase() === activeLanguage.toLowerCase());

        return matchesSearch && matchesLanguage;
    });

    grid.innerHTML = filtered.map(movieCard).join("");

    emptyState.classList.toggle("hidden", filtered.length > 0);
    grid.classList.toggle("hidden", filtered.length === 0);

    resultsLabel.textContent =
        `${filtered.length} movie${filtered.length === 1 ? "" : "s"} found`;

    const count = document.getElementById("movieCount");
    if (count) count.textContent = allMovies.length;
}

function setLanguage(language) {
    activeLanguage = language;
    if (languageFilter) {
        languageFilter.value = language === "international" ? "" : language;
    }

    document.querySelectorAll(".chip").forEach(chip => {
        chip.classList.toggle("active", chip.dataset.language === language);
    });

    renderMovies();

    document.getElementById("movies")?.scrollIntoView({
        behavior: "smooth"
    });
}

async function loadMovies() {
    try {
        const response = await fetch(`${API_URL}/movies`);

        if (!response.ok) {
            throw new Error(`Movies API returned ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Unexpected movie response");
        }

        allMovies = data;
        renderMovies();
        renderSpotlights(allMovies);

    } catch (error) {
        console.error("Unable to load movies:", error);

        if (grid) {
            grid.innerHTML = `
                <div class="loading-card">
                    <h3>Couldn't load the movie collection</h3>
                    <p>Make sure your Flask backend is running on port 5000, then refresh this page.</p>
                </div>`;
        }

        if (resultsLabel) {
            resultsLabel.textContent = "Connection needed";
        }
    }
}

/* Search */
if (searchForm) {
    searchForm.addEventListener("submit", event => {
        event.preventDefault();
        searchText = searchInput?.value.trim() || "";
        renderMovies();
    });
}

if (searchInput) {
    searchInput.addEventListener("input", () => {
        searchText = searchInput.value.trim();
        renderMovies();
    });
}

/* Language dropdown */
if (languageFilter) {
    languageFilter.addEventListener("change", () => {
        activeLanguage = languageFilter.value;

        document.querySelectorAll(".chip").forEach(chip => {
            chip.classList.toggle(
                "active",
                chip.dataset.language === activeLanguage
            );
        });

        renderMovies();
    });
}

/* Language chips */
if (filterChips) {
    filterChips.addEventListener("click", event => {
        const chip = event.target.closest("[data-language]");
        if (chip) setLanguage(chip.dataset.language);
    });
}

document.querySelectorAll("[data-jump-language]").forEach(button => {
    button.addEventListener("click", () => {
        setLanguage(button.dataset.jumpLanguage);
    });
});

/* Clear filters */
document.getElementById("clearFilters")?.addEventListener("click", () => {
    activeLanguage = "";
    searchText = "";

    if (searchInput) searchInput.value = "";
    if (languageFilter) languageFilter.value = "";

    document.querySelectorAll(".chip").forEach(chip => {
        chip.classList.toggle("active", chip.dataset.language === "");
    });

    renderMovies();
});

/* Mobile menu */
document.getElementById("menuButton")?.addEventListener("click", () => {
    document.getElementById("categoryNav")?.classList.toggle("open");
});

/*
 * EXPLORE MOVIE -> LOAD SHOWTIMES -> OPEN SEAT PAGE
 */
grid?.addEventListener("click", async event => {
    const button = event.target.closest("[data-movie-id]");
    if (!button) return;

    const movie = allMovies.find(
        item => Number(item.movie_id) === Number(button.dataset.movieId)
    );

    if (!movie) {
        alert("Movie details could not be found. Please refresh and try again.");
        return;
    }

    const originalText = button.textContent;

    try {
        button.disabled = true;
        button.textContent = "Loading showtimes...";

        const response = await fetch(`${API_URL}/screenings`);

        if (!response.ok) {
            throw new Error(`Screenings API returned ${response.status}`);
        }

        const data = await response.json();

        const screenings = (Array.isArray(data) ? data : data.screenings || [])
            .filter(show =>
                Number(show.movie_id ?? show.Movie_ID) === Number(movie.movie_id)
            );

        if (screenings.length === 0) {
            alert(
                `No upcoming showtimes were returned for ${movie.name}.\n\n` +
                "Check the /screenings API response and the movie ID."
            );
            return;
        }

        const options = screenings.map((show, index) => {
            const theatre =
                show.theatre_name ||
                show.theatre ||
                "CineBook Cinema";

            const rawTime =
                show.show_time ||
                show.screening_time ||
                "";

            const time = rawTime
                ? new Date(rawTime).toLocaleString()
                : "Time unavailable";

            return `${index + 1}. ${theatre} — ${time}`;
        }).join("\n");

        const choice = prompt(
            `Choose a showtime for ${movie.name}:\n\n` +
            `${options}\n\nEnter the option number:`
        );

        if (choice === null) return;

        const index = Number(choice) - 1;

        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= screenings.length
        ) {
            alert("Invalid option. Please click Explore movie and try again.");
            return;
        }

        const show = screenings[index];

        const screeningId =
            show.screening_id ??
            show.Screening_ID ??
            show.id;

        if (screeningId == null || screeningId === "") {
            console.error("Selected screening has no ID:", show);

            alert(
                "The selected showtime does not contain a screening ID.\n" +
                "Please check the JSON returned by your /screenings API."
            );
            return;
        }

        const theatre =
            show.theatre_name ||
            show.theatre ||
            "CineBook Cinema";

        const rawTime =
            show.show_time ||
            show.screening_time ||
            "";

        const query = new URLSearchParams({
            screening_id: String(screeningId),
            movie: movie.name || "",
            theatre: theatre,
            time: rawTime
        });

        // Use the current frontend folder and existing seat.html.
        window.location.href = `seat.html?${query.toString()}`;

    } catch (error) {
        console.error("Unable to load showtimes:", error);

        alert(
            "Could not load showtimes.\n\n" +
            "Check that your Flask backend is running and /screenings returns JSON."
        );

    } finally {
        button.disabled = false;
        button.textContent = originalText || "Explore movie ↗";
    }
});

/* Spotlight cards */
document.querySelectorAll(".mini-grid").forEach(miniGrid => {
    miniGrid.addEventListener("click", event => {
        const card = event.target.closest("[data-mini-movie]");
        if (!card) return;

        const movie = allMovies.find(
            item => Number(item.movie_id) === Number(card.dataset.miniMovie)
        );

        if (!movie) return;

        if (searchInput) searchInput.value = movie.name;
        searchText = movie.name;
        activeLanguage = "";

        if (languageFilter) languageFilter.value = "";

        renderMovies();

        document.getElementById("movies")?.scrollIntoView({
            behavior: "smooth"
        });
    });
});

/* Start the movie collection */
loadMovies();
```
