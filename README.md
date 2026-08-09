# 🏛️ CivicFix — AI-Powered Citizen Intelligence & Resolution Registry

[![Production Live](https://img.shields.io/badge/Production-Live-blueviolet?style=for-the-badge)](https://civic-fix-mu.vercel.app/)
[![Vite Build](https://img.shields.io/badge/Vite_Build-Passing-success?style=for-the-badge)](https://civic-fix-mu.vercel.app/)
[![FastAPI Backend](https://img.shields.io/badge/FastAPI-v0.110.0-blue?style=for-the-badge)](https://civicfix-nthd.onrender.com)
[![Leaflet GIS](https://img.shields.io/badge/GIS_Map-Voyager_Tile-orange?style=for-the-badge)](https://civic-fix-mu.vercel.app/)

> **"See a problem. Verify it. Fix it. Prove it."**  
> CivicFix is an enterprise-grade, closed-loop civic intelligence platform. It converts raw, unstructured citizen observations into verified, deduplicated, prioritized, and dynamically-routed municipal actions, backed by comparative before/after AI verification.

---

## 🔗 Live Production Links
*   **Web Client (Vercel)**: [https://civic-fix-mu.vercel.app/](https://civic-fix-mu.vercel.app/)
*   **API Gateway (Render)**: [https://civicfix-nthd.onrender.com](https://civicfix-nthd.onrender.com/)
*   **Interactive Swagger Documentation**: [https://civicfix-nthd.onrender.com/docs](https://civicfix-nthd.onrender.com/docs)

---

## 🚨 The Crisis: Broken Infrastructure & The Human Cost

### 1. The Human Cost: Lethal Hazards in Plain Sight
Every day, citizens navigate urban spaces littered with neglected hazards. These are not merely structural inconveniences or aesthetic eyesores; they are active threats to human life:
*   **The Deadly Pothole**: An unmarked, water-filled cavity on a high-speed arterial road is a crash site waiting to happen. For a two-wheeler rider, striking a 10cm-deep road cavity at 50 km/h results in violent loss of control, throwing riders into oncoming traffic. **Thousands of fatal accidents occur annually due to delayed road repairs.**
*   **Exposed High-Voltage Cables**: During monsoons, waterlogging turns exposed electrical wires dangling from utility poles or sub-stations into invisible electrocution traps. A single wire touching water can turn an entire street block lethal for pedestrians.
*   **Blacked-Out Intersections**: Non-functioning streetlights on pedestrian crossings create absolute darkness at night, rendering pedestrians invisible to speeding motorists and leading to catastrophic collisions. Additionally, these dark zones become hotspots for street crimes.

**One verified, timely report of a road cavity or exposed cable does not just repair concrete or wiring; it directly prevents a fatal accident and saves a human life.**

### 2. The Administrative Crisis: The Triage Bottleneck
While citizens are surrounded by these hazards, municipal administrations are crippled by structural operational bottlenecks:
*   **The Noise-to-Signal Disaster**: Citizens post issues across fragmented channels—social media tags, phone calls, and static web portals. These reports are often vague (e.g., *"wire loose near park"*), lack precise GPS coordinates, and are missing images, forcing municipal operators to spend hours manually inspecting locations just to determine the exact hazard.
*   **The Duplicate Avalanche**: When a major road develops a pothole, hundreds of citizens report it. In traditional systems, this triggers hundreds of separate tickets. The database is flooded with duplicate noise, burying critical, single-report hazards (like gas leaks or exposed wires) under administrative clutter.
*   **The Inspection and Trust Gap**: City workers waste massive budgets sending field inspectors to verify issues that are either duplicate, mislocated, or already resolved. As a result, tickets take weeks to resolve, causing citizens to lose trust and stop reporting entirely.
*   **The Contractor Resolution Loophole**: Contractors frequently mark tickets as "Resolved" to clear invoicing queues, providing either no proof or old, recycled photos. Without automated before/after verification, municipalities pay for sub-par or incomplete repairs.

---

## 💡 The Solution: CivicFix Closed-Loop Architecture

CivicFix transforms municipal operations by replacing manual triage with **six integrated AI agents** in an **Evidence-First design**:

```mermaid
graph TD
    A[Citizen Snaps Photo] --> B[AI Vision Analyzer]
    B -->|Classifies & Resolves Coords| C{AI Duplicate Detector}
    C -->|Duplicate Found| D[Upvote Existing Ticket & Escalate Priority]
    C -->|New Issue| E[AI Severity Engine]
    E --> F[AI Smart Router]
    F -->|Assigns Queue| G[Municipal Department Dispatch]
    G --> H[Contractor Uploads Resolution Photo]
    H --> I[AI Before/After Comparator]
    I -->|Validates Reconstruct| J[Citizen Closes Case]
```

### The Closed-Loop Paradigm
*   **Step 1: Evidence Capture**: Citizen uploads an image and address.
*   **Step 2: AI Triage & Parsing**: The AI Vision Analyzer classifies the issue, identifies hazards, and determines baseline severity.
*   **Step 3: Proximity Deduplication**: The system runs spatial and visual correlation checks. If a matching issue exists nearby, the user is redirected to upvote the existing ticket, consolidating resources.
*   **Step 4: Smart Routing**: The ticket is automatically routed to the correct municipal agency (e.g., Water Board, Road Authority) based on category rules.
*   **Step 5: Visual Proof of Resolution**: The contractor uploads an "After" photo. The AI Before/After Comparator validates that the structural defect was resolved before marking the ticket as ready for closure.
*   **Step 6: Citizen Verification**: The citizen inspects the repair using a before/after slider and marks the ticket closed, completing the loop.

---

## 🏷️ General-Purpose Extensibility: Supported Categories

CivicFix is engineered as a **flexible, general-purpose civic intelligence grid**. Rather than being locked to a single type of issue, the underlying AI models (FastAPI keyword rules + Gemini + YOLO) dynamically classify, route, and analyze **any type of public hazard or municipal registry item** across key city verticals:

*   **⚡ Electricity & Utilities**: Exposed high-voltage lines, dangling street cables, dark/flickering streetlights, damaged distribution boxes, and faulty traffic signals.
*   **🛣️ Roads & Mobility**: Potholes, road depressions, missing manhole covers, cracked asphalt, blocked walkways, and damaged safety barriers.
*   **🚰 Water & Sanitation**: Burst potable water mains, open/overflowing sewage lines, blocked storm drains, and neighborhood flooding.
*   **🚯 Waste & Environmental**: Garbage pile-ups, overflowing public dumpsters, illegal debris dumping, and toxic environmental hazards.
*   **⚠️ Safety & Compliance**: Illegal parking blocking pedestrian sidewalks/fire lanes, stray animal hazards, and public property vandalism.
*   **🎒 Community Registry (Lost & Found)**: A specialized, secure board for reporting, locating, and matching lost wallets, keys, bags, electronics, or pets using dHash visual correlation.

---

## 🔬 Under the Hood: The AI Engines

### 1. Multimodal Vision Analyzer (`vision_analyzer.py`)
Processes uploads to extract structured civic data:
*   **API Model (Gemini 2.5 Flash)**: Sends images and user-entered descriptions to classify the issue into categories (e.g., *Exposed Wire*, *Pothole*, *Water Leakage*, *Lost and Found*), identifying hazards and severity.
*   **Local YOLO Fallback (`yolo11n.pt`)**: If the API is offline or keyless, the system automatically downloads the `yolo11n.pt` weights and loads the model locally using `ultralytics`. It detects physical objects (such as traffic signs, poles, vehicles, animals, bags) and couples it with a regex keyword matcher to classify the ticket.

### 2. Spatial & Visual Duplicate Detector (`duplicate_detector.py`)
Scans active issues within a 150m radius to correlate reports:
*   **Geospatial Distance (Haversine Formula)**: Compares coordinates using:
    $$\Delta\sigma = 2 \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
    $$d = R \cdot \Delta\sigma$$
    Where $R = 6,371,000\text{ meters}$. If $d > 150\text{ meters}$, the issue is skipped.
*   **Semantic Text Analysis (TF-IDF + Cosine Similarity)**: Converts descriptions into term-frequency vectors and calculates:
    $$\text{Similarity} = \cos(\theta) = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$
*   **Visual Image Correlation (dHash + Hamming Distance)**:
    1. Grayscales the image and downsamples it to a $9\times8$ grid.
    2. Computes the difference between horizontally adjacent pixels to generate a 64-bit binary matrix.
    3. Calculates visual similarity based on the Hamming distance (bit difference). visually identical items (such as the same lost handbag) trigger correlation warnings.

### 3. Dynamic Priority & Severity Engine (`severity_engine.py`)
Determines the urgency score $S \in [0.0, 1.0]$:
*   **Base Weight ($W_b$)**: Derived from AI classification (e.g., *Exposed Wire* = 0.8, *Pothole* = 0.6, *Lost and Found* = 0.2).
*   **Support Weight ($W_s$)**: Scaled logarithmically by community upvotes:
    $$W_s = \min(0.2, 0.05 \cdot \ln(1 + \text{supports}))$$
*   **Density Weight ($W_d$)**: Scaled by the density of similar issues within the ward:
    $$W_d = \min(0.15, 0.03 \cdot \text{duplicates})$$
*   **Total Score**:
    $$S = \min(1.0, W_b + W_s + W_d)$$
    This score is mapped to priority tiers: Low ($<0.4$), Medium ($0.4 - 0.6$), High ($0.6 - 0.8$), and Critical ($\ge0.8$).

### 4. Smart Routing Engine (`routing_engine.py`)
*   Assigns the ticket to the correct municipal agency (e.g., *Electricity Board* for exposed wires, *Road Authority* for potholes, *Water Board* for leaks) and locates the appropriate ward supervisor.

### 5. Resolution Image Comparator (`resolution_comparator.py`)
*   Compares the original "Before" image with the contractor's uploaded "After" image. It analyzes color histogram distribution shifts and structural similarity index (SSIM) to verify that the repair is physically complete (e.g., the pothole has been covered with asphalt).

### 6. Conversational Chatbot Assistant (`chatbot.py`)
*   An interactive helper that lets users report issues, check case statuses, or locate nearby hazards in natural language.

---

## 📡 REST API Reference & JSON Payload Examples

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/signup` | `POST` | Public | Register a new user profile (Citizen, Operator, Admin). |
| `/api/auth/login` | `POST` | Public | Login gateway supporting both email and username. |
| `/api/auth/me` | `GET` | Bearer | Retrieve details of the current logged-in user. |
| `/api/issues` | `GET` | Public | Retrieve a list of active issues (filters: ward, status, category). |
| `/api/issues` | `POST` | Bearer | Report a new issue (form-data: title, desc, coords, photo). |
| `/api/issues/check-duplicates` | `POST` | Bearer | Query duplicate detector with photo, coords, and description. |
| `/api/issues/{id}` | `GET` | Public | Fetch detailed audit logs, upvotes, history, and photos for a case. |
| `/api/issues/{id}/status` | `PATCH` | Bearer | Transition issue status (e.g. `IN_PROGRESS`). |
| `/api/issues/{id}/resolve` | `POST` | Operator | Upload resolution proof photo and notes to mark `RESOLVED`. |
| `/api/issues/{id}/verify` | `POST` | Reporter | Citizen verification of resolution to close/reopen ticket. |
| `/api/analytics/dashboard` | `GET` | Public | Retrieve system-wide statistics (trends, categories, priorities). |
| `/api/analytics/hotspots` | `GET` | Public | Run DBSCAN spatial clustering to retrieve city hotspots. |
| `/api/assistant` | `POST` | Bearer | Query conversational chatbot with geolocation context. |

### API Payload Example: `/api/issues/check-duplicates`
*   **Request Type**: `multipart/form-data`
*   **Parameters**:
    *   `description`: `"Found a red Michael Kors purse with a gold MK logo and chain strap on a bench."`
    *   `latitude`: `12.9801`
    *   `longitude`: `77.6010`
    *   `file`: `[red_purse.jpg image binary]`
*   **JSON Response (`200 OK`)**:
    ```json
    {
      "is_duplicate": true,
      "suggestions": [
        {
          "primary_issue_id": "CIV-LOST-MK",
          "title": "Lost Red Michael Kors Purse",
          "distance_meters": 0.0,
          "similarity_score": 0.75,
          "status": "REPORTED",
          "category_match": false,
          "media_url": "/api/issues/media/6"
        }
      ]
    }
    ```

---

## 💾 Database Schema

The SQLite database (`civicfix.db`) is structured to preserve transaction history and maintain audit logs:

### 1. `users` Table
*   `id` (INTEGER, Primary Key): Unique user ID.
*   `username` (VARCHAR, Unique): Login name.
*   `email` (VARCHAR, Unique): Login email.
*   `password_hash` (VARCHAR): Secure password representation.
*   `role_id` (INTEGER, Foreign Key $\to$ `roles.id`).

### 2. `issues` Table
*   `id` (VARCHAR, Primary Key): Unique alphanumeric ticket ID (e.g., `CIV-28491`).
*   `title` (VARCHAR): User-provided or AI-generated title.
*   `description` (TEXT): Detailed description of the issue.
*   `category_id` (INTEGER, Foreign Key $\to$ `issue_categories.id`).
*   `reporter_id` (INTEGER, Foreign Key $\to$ `users.id`).
*   `status` (VARCHAR): Current lifecycle state (`REPORTED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLUTION_SUBMITTED`, `RESOLVED`, `CLOSED`).
*   `severity` (VARCHAR): Priority tier (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
*   `created_at` (TIMESTAMP) & `updated_at` (TIMESTAMP).

### 3. `issue_locations` Table
*   `issue_id` (VARCHAR, Foreign Key $\to$ `issues.id`, Primary Key).
*   `latitude` (FLOAT) & `longitude` (FLOAT).
*   `address` (VARCHAR): Street address.
*   `ward` (VARCHAR): Municipal ward zone.

### 4. `issue_media` Table
*   `id` (INTEGER, Primary Key).
*   `issue_id` (VARCHAR, Foreign Key $\to$ `issues.id`).
*   `media_path` (VARCHAR): Relative URL to the file.
*   `is_resolution` (BOOLEAN): `0` for before/evidence photo, `1` for after/resolution photo.

### 5. `issue_status_history` Table (Audit Log)
*   `id` (INTEGER, Primary Key).
*   `issue_id` (VARCHAR, Foreign Key $\to$ `issues.id`).
*   `status` (VARCHAR): Status changed to.
*   `notes` (TEXT): Audit trail notes.
*   `changed_by_id` (INTEGER, Foreign Key $\to$ `users.id`).
*   `created_at` (TIMESTAMP).

---

## 🎨 Frontend Design & Architecture

The user interface uses a **Deep Midnight Glassmorphism** design language inspired by modern SaaS applications:

*   **Color System**: Midnight base (`hsl(222, 47%, 4%)`) paired with royal accents (`hsl(263, 90%, 50%)`) and vibrant alert indicators.
*   **Bespoke SVG Charts**: Standard ChartJS/React canvas libraries often crash or fail to resize correctly inside responsive CSS grids. CivicFix uses **custom-engineered SVG React components** to render clean, interactive charts:
    *   *Category Load*: Rounded SVG column bars.
    *   *Weekly Trends*: Gradient-filled bezier wave paths.
    *   *Priority Load*: Dynamic percentage progress tracks.
*   **Voyager GIS mapping**: The Leaflet map uses the high-contrast **CartoDB Voyager** tile layer, rendering road details, municipal boundaries, and hotspot clusters in a clean, readable format.

---

## 🚀 Local Installation & Set-Up

### Prerequisites
*   Node.js (v18+)
*   Python (3.10+)

### 1. Backend Server Setup
Navigate to the root directory:
```bash
# Set up a virtual environment (optional)
python -m venv venv
source venv/bin/activate # On Windows: venv\Scripts\activate

# Install python dependencies
pip install -r backend/requirements.txt

# Seed the SQLite database with mock cases
python -m backend.app.seed

# Launch the dev server
python -m uvicorn backend.app.main:app --reload --port 8000
```
*API docs will be available at `http://localhost:8000/docs`.*

### 2. Frontend Development Setup
Navigate to the frontend folder:
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 📦 Container Deployment (Docker)

To run the entire system locally in production mode (compiled React static build served via **Nginx** + **Uvicorn** API gateway):
```bash
docker-compose up --build -d
```
*   **Web Client URL**: `http://localhost` (Port 80)
*   **API Gateway URL**: `http://localhost:8000`

---

## ⚡ Demo Walkthrough Script

Verify the closed-loop features of the application using this scenario:

1.  **Sandbox Login**: Open [https://civic-fix-mu.vercel.app/](https://civic-fix-mu.vercel.app/). Click the **Citizen** sandbox card to log in instantly as `Satwik`.
2.  **File a Report**: Click **"Report a Civic Problem"**.
    *   Select **Enter Address Manually**.
    *   Type `Gandhinagar, Vellore` *(This auto-resolves to Ward 7 coordinates in the background).*
    *   Upload an image, type *"Pothole on road"*, and click **Run AI Triage**.
3.  **Verify Duplicate Detection**: The AI duplicate detector will locate `CIV-28491` (already reported 0m away), display a side-by-side card with the matching photo, and suggest you upvote it. Click **"Support Existing Issue"**.
4.  **Triage as Operator**: Click **Log Out**, and click the **Authority Operator** sandbox card to log in. 
5.  **Review the Dashboard**: Access the **Dashboard** view to view SVG trend graphs and see the prioritized queue.
6.  **Progress Case**: Open the details for case `CIV-28491` in the queue. Click **Start Work** (sets status to `IN_PROGRESS`).
7.  **Submit Resolution**: Click **Resolve Case**, type *"Asphalt laid and rolled flat"*, upload a photo, and submit. The backend runs the before/after image comparison.
8.  **Citizen Closure**: Log back in as the Citizen. Open the details for `CIV-28491`. You will see the **Before/After verification slider**. Move the slider to inspect the repair, then click **Yes, Fixed** to close the ticket!
