# SHSRS — Helmet Reservation Storage System

A full-stack app for reserving and unlocking helmet storage cabinets with QR codes.
Riders book one of 12 cabinet slots, submit payment for Finance review, then receive a personal QR access pass after verification.
Finance users review payments; administrators manage slots, reservations, users and the access log.
Security users view the prototype cabinet's database-backed slot status and operate the existing reservation QR scanner.

**Stack:** React Native (Expo, runs on phone + browser) · Node.js / Express API · MySQL / MariaDB (XAMPP)

---

## Features

**Riders**
- Scan a student ID QR containing a name, 10-digit student ID, and course/program before registering; log in with bcrypt-hashed passwords and JWT sessions
- Home with next reservation, free slots today and recent cabinet activity
- Slots view for database-backed availability; Reservation form and My Reservations list
- Reserve a slot by date and time (live availability, no double bookings)
- Submit a PHP 25.00 payment with a receipt image for Finance review
- Search, reschedule, cancel and export reservations as PDF
- Unique QR access pass per reservation after payment verification (download / share)
- QR code and Access Guide tabs
- Profile: photo, name, email, phone, password change, delete account
- Light / dark mode

**Finance**
- Separate role assigned by an administrator to an existing account
- Separate Pending Payments and History tabs
- Review pending receipts, approve or reject payments, and view processed transactions

**Security**
- Separate role assigned by an administrator to an existing account
- Slots tab displays the configured slots for the single prototype cabinet, including today's reservation and maintenance status
- Camera Scanner reuses the reservation QR verification flow and records helmet storage/retrieval events
- API access is restricted to Security and Admin accounts; Security accounts cannot create or manage Rider reservations
- The scanner submits the full reservation QR to the backend. After strict validation, the backend queues a short-lived command for the authenticated ESP32, which briefly actuates one SG90 servo on the shared prototype cabinet door.

**Administrators**
- Slot maintenance (block / unblock slots)
- View and cancel any reservation
- Users list, Finance/Security role assignment and full cabinet access log
- Export reservations to CSV

**Business rules (enforced by the server)**
- Registration requires the scanned QR payload to contain a name, one 10-digit student ID, and a course/program; the student ID is unique
- The student-registration ID QR payload contains no school or campus data, so registration does **not** independently verify USTP enrollment or prove that the ID belongs to the person scanning
- 12 slots; one booking per slot per date
- Bookings must be in the future; blocked slots cannot be booked
- QR access is denied until Finance verifies the PHP 25.00 payment
- A full reservation QR scan is accepted from **30 minutes before** the reserved time until the end of that day. The backend verifies the QR HMAC signature, compares every QR field against the database, verifies payment/status and maintenance state, updates the stored/retrieved state and access log, then queues a 30-second command for the authenticated ESP32. Reservation ID text alone is not accepted for physical unlocking.
- New registrations are Riders; provision administrator access separately
- Finance and Security roles are assigned by an administrator, and cannot be assigned together
- The project models one prototype cabinet with 12 logical reservation slots. One SG90 servo operates one shared physical cabinet-door latch; it does not select or unlock 12 separate compartments.
- Passwords need at least 8 characters
- Phone numbers are collected for future notifications; SMS delivery is not configured

---

## Project structure

```
shsrs/
├── App.js              # Compatibility re-export of the Expo app
├── app/                # Expo project
│   ├── App.js
│   ├── app.json
│   ├── assets/
│   ├── components/     # Shared and role-specific UI components
│   ├── navigation/     # Role-based navigators
│   ├── screens/        # Authentication, role screens, home and profile
│   │   ├── admin/
│   │   ├── finance/
│   │   └── rider/
│   ├── services/       # API and domain services
│   ├── shared/         # Hooks, constants and utilities
│   └── styles/
├── hardware/
│   └── esp32/
│       ├── main.py         # MicroPython controller for one SG90 servo
│       └── README.md       # Wiring and ESP32 setup
├── server/
│   ├── server.js       # Express API
│   ├── cabinetQr.js    # Signed reservation QR validation
│   ├── package.json
│   ├── schema.sql      # Database tables including ESP32 command queue
│   ├── .env.example    # Server/device configuration template
│   ├── migrations/     # Existing database migrations
│   └── demo_data.sql   # Optional sample data
├── package.json        # One-command launcher (API + app together)
├── start.bat           # Double-click launcher for Windows
└── README.md
```

---

## Requirements

- **Node.js 20+** (check with `node -v`)
- **XAMPP** with MySQL (MariaDB) and phpMyAdmin
- A browser (Chrome recommended) — and optionally **Expo Go** on your phone

---

## Setup (first time)

### 1. Database
1. Open XAMPP and start **MySQL**.
2. Open phpMyAdmin → `http://localhost/phpmyadmin` → **Import**.
3. Import `server/schema.sql` (creates the `shsrs` database and tables).
4. *(Optional)* import `server/demo_data.sql` for sample users and reservations.

For an existing SHSRS database, apply the migrations in order: `server/migrations/001_finance_payments.sql`, `server/migrations/002_payment_receipt_only.sql`, `server/migrations/003_student_registration.sql`, then `server/migrations/004_security_role.sql`, then `server/migrations/005_esp32_servo.sql`. They add Finance/payment support, make the legacy payment-method column optional, add student ID/course columns with a unique student ID index, add the Security role flag, and create the ESP32 command queue. Existing reservations remain unconfirmed until a receipt is submitted and approved.

### 2. Configure the ESP32 device secret (before testing hardware)
1. Copy `server/.env.example` to `server/.env` (Windows: `copy server\.env.example server\.env`).
2. Generate three separate random values by running this command three times: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
3. Put the first value in `JWT_SECRET`, the second in `QR_SECRET`, and the third in `ESP32_DEVICE_TOKEN`. Keep all three private.
4. The `.env` file is loaded by the server and is excluded from Git.

### 3. Install the server and launcher
```bash
cd C:\Users\Admin\shsrs
npm run setup
```

### 4. Install the app packages
```bash
npm install --prefix app
```

---

## Running

Start **MySQL** in XAMPP, then from the `shsrs` folder:

```bash
npm start
```
or double-click **`start.bat`**. This starts the API (`http://localhost:3000`) and the app (`http://localhost:8081`) in one window. Press **Ctrl+C** to stop both.

Open **http://localhost:8081** in your browser.

> Close any old API/app windows first so ports 3000 and 8081 are free.

### Demo accounts (after importing `demo_data.sql`)

| Role  | Email                | Password   |
|-------|----------------------|------------|
| Admin | `admin@shsrs.demo`   | `Admin1234`|
| Rider | `maria@shsrs.demo`   | `Rider1234`|

Other riders: `juan@`, `ana@`, `carlo@`, `liza@` `shsrs.demo` (same password).
Without demo data, registration creates Rider accounts only. A trusted database operator must provision an initial administrator directly in the database; there is no administrator self-service registration or promotion flow.

### Running on a phone (Expo Go)
1. Phone and PC must be on the **same Wi-Fi**.
2. Find your PC's IPv4 address with `ipconfig`.
3. In `app/src/constants/config.js`, set `PC_IP` to that address and restart.
4. Scan the Expo QR code with Expo Go. Allow Node through Windows Firewall if asked.

### Finance or Security account
1. Register a separate account normally, including a phone number.
2. Log in as Admin and select **Make Finance** or **Make Security** for that account in the Users list. An account must be removed from its current role before it can be assigned the other one.
3. Log in using that account to open the role-specific dashboard.

Students submit a receipt image with each reservation. Finance can approve or reject pending payments; only approved payments release the reservation QR code. SMS notifications are not sent because no SMS provider is configured.

---

## Configuration

The API reads these environment variables from `server/.env` (defaults suit a fresh XAMPP):

| Variable     | Default         | Purpose                     |
|--------------|-----------------|-----------------------------|
| `DB_HOST`    | `localhost`     | MySQL host                  |
| `DB_PORT`    | `3306`          | MySQL port                  |
| `DB_USER`    | `root`          | MySQL user                  |
| `DB_PASS`    | *(empty)*       | MySQL password              |
| `DB_NAME`    | `shsrs`         | Database name               |
| `PORT`       | `3000`          | API port                    |
| `JWT_SECRET` | `change-this-secret` | **Set your own before use** |
| `ESP32_DEVICE_ID` | `cabinet-esp32-01` | Identifier for the single ESP32 controller |
| `ESP32_DEVICE_TOKEN` | *(not set)* | Required long random secret shared only with the ESP32 |
| `QR_SECRET` | `JWT_SECRET` fallback | Long random secret used to sign reservation QR codes |

Windows example: `set DB_PASS=mypassword` before `npm start`.

---

## Database

| Table          | Purpose                                                        |
|----------------|----------------------------------------------------------------|
| `users`        | Accounts (bcrypt password hash, photo, phone, Admin, Finance and Security roles) |
| `slots`        | The 12 cabinet slots and their maintenance flag                |
| `reservations` | Bookings; unique per (`slot_no`, `res_date`); status and `stored` flag |
| `payments`     | Student-submitted receipt image, status and processing history |
| `access_log`   | Every Stored / Retrieved event                                 |
| `esp32_commands` | Short-lived, authenticated ESP32 unlock command queue |

Deleting a user cascades to their reservations and related payments; log entries are kept.

---

## API reference

App routes need `Authorization: Bearer <token>` except `register`, `login` and `health`. ESP32-only routes use the separate `X-Device-Id` and `X-Device-Token` headers.

| Method | Route                              | Description                          |
|--------|------------------------------------|--------------------------------------|
| GET    | `/api/health`                      | Checks API + database + tables       |
| POST   | `/api/register`                    | Create account → token               |
| POST   | `/api/login`                       | Log in → token                       |
| GET    | `/api/data`                        | Everything the app needs             |
| POST   | `/api/reservations`                | Book a slot                          |
| POST   | `/api/reservations/:id/payments`   | Submit payment and receipt           |
| GET    | `/api/finance/payments`            | List pending payments *(Finance)*     |
| GET    | `/api/finance/payments/:id/receipt`| View a pending receipt *(Finance)*    |
| GET    | `/api/finance/payment-history`     | View processed payments *(Finance)*   |
| POST   | `/api/finance/payments/:id/verify` | Verify a pending payment *(Finance)*  |
| POST   | `/api/finance/payments/:id/reject` | Reject a pending payment *(Finance)*  |
| PUT    | `/api/admin/users/:id/finance`     | Assign/remove Finance role *(admin)*  |
| PUT    | `/api/admin/users/:id/security`    | Assign/remove Security role *(admin)* |
| GET    | `/api/reservations/:id/qr`         | Get QR after verified payment        |
| PUT    | `/api/reservations/:id`            | Reschedule (own)                     |
| DELETE | `/api/reservations/:id`            | Cancel (own)                         |
| POST   | `/api/scan`                        | Validate full QR, update log and queue ESP32 unlock *(Security/Admin)* |
| GET    | `/api/device/commands/next`        | Fetch one authorized, unexpired command *(ESP32 secret)* |
| POST   | `/api/device/commands/:id/ack`     | Acknowledge servo result *(ESP32 secret)* |
| PUT    | `/api/me`                          | Update name, email and phone         |
| PUT    | `/api/me/photo`                    | Set or remove profile photo          |
| PUT    | `/api/me/password`                 | Change password                      |
| DELETE | `/api/me`                          | Delete account                       |
| PUT    | `/api/admin/slots/:n/toggle`       | Block / unblock slot *(admin)*       |
| DELETE | `/api/admin/reservations/:id`      | Cancel any reservation *(admin)*     |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| **"Server not reachable"** | The API isn't running. Run `npm start` and keep the window open. |
| **"Database problem"** | Start MySQL in XAMPP and import `schema.sql`. |
| `http://localhost:3000/api/health` error | `ER_NO_SUCH_TABLE` / `ER_BAD_DB_ERROR` → import `schema.sql`. `ECONNREFUSED` → start MySQL. `ER_ACCESS_DENIED_ERROR` → set `DB_PASS`. |
| `localhost:8081` can't be reached | The app isn't running — start with `npm start`. |
| Blank page | Press F12 → Console and read the first red error. Try `npx expo start --web --clear`. |
| `EADDRINUSE` | A port is already in use. Close old windows or restart the PC. |
| `Need to install the following packages… Ok to proceed? (y)` | Type `y` and press Enter — don't type another command. |
| Scanner says "Too early" | A slot opens 30 minutes before its reserved time. |
| Phone can't connect | Check `PC_IP`, same Wi-Fi, and Windows Firewall. |

Health check: `http://localhost:3000/api/health` → `{"ok":true,"db":"connected"}`. It also confirms that the ESP32 command-queue migration is installed.

## ESP32 + SG90 hardware integration

The app's existing Cabinet Scanner remains the QR entry point. It sends the full, newly generated signed QR string to `POST /api/scan`; numeric reservation IDs are not valid unlock credentials. After applying this update, students should reopen the QR Code screen in the app to load the newly signed QR. Older screenshots/printed QR codes from before this update will be rejected. The Node backend checks the reservation ID, encoded student user ID, slot, date and time against MySQL, verifies the reservation is Confirmed and has a Verified payment, checks the slot is not blocked, and enforces the existing access window. Only then does it create an `esp32_commands` queue row.

The ESP32 authenticates with `X-Device-Id` and `X-Device-Token`, polls for a command, moves the SG90 to its unlock angle briefly, returns it to the locked angle, and acknowledges the command. Commands expire after 30 seconds. If the device token is missing or validation fails, no unlock command is created.

Follow `hardware/esp32/README.md` for the complete wiring and MicroPython setup. Use the PC's LAN IPv4 address in the ESP32 `API_BASE_URL`; `localhost` will not work from the ESP32. The PC firewall must allow inbound TCP port 3000 on the private network.

**Physical limitation:** one SG90 operates one shared cabinet-door latch. The app still has 12 logical slot numbers, but one servo cannot independently unlock 12 separate compartment doors.


---