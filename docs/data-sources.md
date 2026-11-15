# Mars Intelligence: sources, provenance, and refresh behavior

## Runtime sources

| Source | Endpoint | What is ingested | What is not inferred |
| --- | --- | --- | --- |
| NASA Photojournal Mars feed | `https://science.nasa.gov/feed/photojournal/gallery/mars/` | Mars-keyword-filtered publication title, official NASA link, RSS publication date | Image acquisition time, exact instrument, location, surface change, hazard severity |
| NASA recently published feed | `https://www.nasa.gov/feed/` | Recent items matching Mars/rover/mission keywords | Complete Mars news coverage or a complete historical archive |
| NASA DONKI solar flares, optional | `https://api.nasa.gov/DONKI/FLR` | Last seven days of flare identifiers, class and start time | Particle arrival at Mars, local dose, astronaut exposure, or an operational emergency |

NASA documents the feeds at <https://www.nasa.gov/rss-feeds/> and <https://science.nasa.gov/photojournal/rss-feeds/>. The Mars feed redirects to a NASA Science WordPress RSS feed. Both RSS endpoints were fetched successfully during development on November 15, 2026. A real call to `intelligenceResponse` returned six Mars-relevant Photojournal records after keyword filtering and zero matching items in the current general NASA feed. A valid empty feed is not a source error.

DONKI is deliberately unavailable unless `NASA_API_KEY` is configured as a **server environment variable**. No key is bundled in browser files, JSON exports, or error messages. The app does not use `DEMO_KEY` or pretend that an unconfigured source is operating.

`GET /api/intelligence` fetches fixed allowlisted endpoints server-side. Items must link to HTTPS NASA domains. RSS parsing does not expand XML entities; responses are bounded to 1.5 MB and 100 items per feed. The UI uses text nodes for untrusted titles and descriptions. Publication timestamps remain separate from acquisition timestamps. Unknown acquisition and publication times stay null.

## Cache and scheduling

The target refresh interval is 15 minutes **while the website is open and visible**. Manual refresh is available. The server uses a 15-minute cache and a shared per-runtime one-minute manual-refresh limit. Concurrent requests in the same Worker runtime share one in-flight refresh. Failed RSS requests are retried once.

Where the existing `BUCKET` binding is present, public official-source metadata is cached at `public-science/intelligence.json`. This data is separate from the user-prefixed private mission saves. A runtime memory cache and browser cache provide fallbacks. Failed fetches retain earlier records; the UI shows last successful synchronization, per-source health, and stale indicators. Records older than one hour since the last successful synchronization are stale. The age of a publication is separate from synchronization freshness.

**No background scheduler has been configured.** Closing the website stops the client refresh loop. This implementation does not claim to monitor all NASA websites or produce instantaneous updates. A deployment owner may separately configure scheduled requests to the public metadata endpoint if the hosting platform supports them; the app does not silently create an external automation.

## Classification

- `INFORMATIONAL`: an official publication, historical milestone, or personal record. This is not an operational alert.
- `ADVISORY`: a DONKI solar flare, when configured, with unverified relevance at Mars.
- `WARNING` and `CRITICAL`: not issued because the app has no validated mission-specific threshold or propagation/exposure model. Their filters show an empty result when no such records exist.

The catalog has no current Jezero wind, dust, radiation-dose, oxygen, or chemical-reaction feed. A solar flare is never automatically treated as a confirmed Mars radiation emergency.

## Curated historical catalog

`public/observations.json` includes selected official mission milestones and two MEDA measurement summaries. It is sparse and intentionally incomplete. Every record retains its original source link. Landing locations are static historical points, not fabricated rover traverse records. Locations are null where no precise point was verified for that observation.

- Mariner 4 closest approach is **July 15, 1965 at 01:00:57 UTC**, commonly commemorated as July 14 EDT. Source: <https://science.nasa.gov/mission/mariner-4/>.
- Mariner 9 orbit insertion is November 14, 1971, 00:18 UTC. Source: <https://science.nasa.gov/mission/mariner-9/>.
- Viking landing dates are July 20 and September 3, 1976. Sources: <https://science.nasa.gov/mission/viking-1/>, <https://science.nasa.gov/mission/viking-2/>. Viking 2 coordinates are the planetocentric NASA NSSDCA landing-site coordinates: <https://nssdc.gsfc.nasa.gov/planetary/viking.html>.
- Pathfinder landed July 4, 1997. The contemporary NASA status report supplies a public release date: <https://science.nasa.gov/solar-system/planets/mars/mars-pathfinder-lands-on-mars/>.
- Spirit and Opportunity landed **January 4 and January 25, 2004 UTC**. The often-cited January 3 and January 24 dates are Pacific local dates. Source: <https://science.nasa.gov/3d-resources/mars-exploration-rover-spirit-and-opportunity/>. Spirit coordinates: <https://science.nasa.gov/mission/mer-spirit/>.
- Curiosity landed August 6, 2012 UTC: <https://science.nasa.gov/resource/curiosity-has-landed/>.
- InSight landed November 26, 2018: <https://www.nasa.gov/news-release/nasa-insight-lander-arrives-on-martian-surface-to-learn-what-lies-beneath/>.
- Perseverance landed February 18, 2021: <https://science.nasa.gov/blogs/perseverance-mars-rover/2021/02/18/blog-nasas-perseverance-has-landed/>. Coordinates 18.4446° N, 77.4509° E are documented in Bell et al. (2022), *Geological, multispectral, and meteorological imaging results from the Mars 2020 Perseverance rover in Jezero crater*, NASA-hosted paper: <https://ntrs.nasa.gov/api/citations/20230016428/downloads/Bell%20et%20al%202022sciadv.pdf>.
- Ingenuity's first powered flight was April 19, 2021: <https://www.nasa.gov/news-release/nasas-ingenuity-mars-helicopter-succeeds-in-historic-first-flight/>.
- MEDA's 718 Pa initial pressure observation was February 19, 2021. The −83…−22 °C extrema span **April 3–4, 2021, sols 43–44**; they are not independent daily measurements. Both were reported April 6, 2021 by NASA/JPL: <https://www.jpl.nasa.gov/news/nasas-first-weather-report-from-jezero-crater-on-mars/>. The summary does not give a precise coordinate for each measurement; they are therefore not assigned to the landing point or route cells.

Day-precision records retain ISO dates without inventing a midnight measurement time. Timestamps with known UTC precision are retained. Source timestamps, publication timestamps, and ingestion timestamps are distinct fields.

## Historical semantics

**Observed on Date** returns events or acquisition windows intersecting the chosen UTC day. Multi-day measurements remain labeled with their full window.

**Known by Date** returns records whose verified public release date is on or before that day. Unknown publication dates are excluded. The app does not assume a modern mission summary existed on the date of a historical event. A user-entered observation has no verified NASA public release date and is excluded from this mode.

Replay advances between actual catalog dates, not imaginary daily weather samples. It does not move a rover through invented historical positions. Static terrain is not a reconstruction of historical appearance. Date comparison shows available records and measurements; image change comparison is disabled because no sufficiently aligned, compatible, dated image pair is loaded.

Map proximity searches use approximate Mars distances at sampled route vertices, with a 1 km context radius. This is a record-discovery aid, not an environmental corridor analysis or a safety result. No precise point is fabricated for region-only weather reports.

## Personal observations and security

Personal observations are stored in `localStorage` on the current browser. They do not synchronize with teammates or authenticated server mission saves. Users can create, edit, delete, map, filter, export JSON/CSV, and import JSON records. Optional attachments accept PNG/JPEG/WebP only, under 500 KB. Imports are limited to 2.5 MB and 100 records, validate finite coordinates and measurement values, reject invalid UTC calendar dates and duplicate IDs, discard supplied NASA verification fields, and label every accepted record `USER-ENTERED — NOT NASA VERIFIED`.

Dynamic text is rendered with `textContent`. User image data URLs cannot be SVG or executable URLs. CSV fields are quoted, and formula-like leading content is escaped to reduce spreadsheet formula injection. Importing JSON does not execute code. Browser storage failures are surfaced rather than claiming the record was saved.

## Validation performed

`node --test test/intelligence.test.js` covers acquisition-versus-publication filtering, unknown publication dates, multi-day observation windows, invalid imports and images, coerced verification status, malformed dates/coordinates, duplicate IDs, CSV escaping, RSS deduplication and source-link restrictions, and endpoint method handling, cache request suppression, retained data through outages, and stale-source indicators. These seven tests passed. Both feeds are filtered for Mars relevance because the documented Mars Photojournal URL can redirect to a broader feed. Legacy cached unrelated records are also removed. Browser integration is verified separately by the site owner; this document does not claim tests that have not been performed.
