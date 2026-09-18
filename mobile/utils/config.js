/**
 * IMPORTANT — read this before running the app on a phone or emulator.
 *
 * "localhost" on your PHONE means the phone itself, NOT your computer.
 * So you cannot use http://localhost:5000 here when testing on a real
 * Android device (it works only inside a web browser on the same PC).
 *
 * Steps:
 * 1. Make sure your phone and your computer are on the SAME Wi-Fi network.
 * 2. Find your computer's local IP address:
 *      Windows (PowerShell): ipconfig
 *      Look for "IPv4 Address" under your active Wi-Fi adapter,
 *      e.g. 192.168.0.195
 * 3. Replace the IP below with that address. Keep the port :5000 and the
 *    "/api" suffix.
 * 4. Make sure the Flask backend is running with host="0.0.0.0"
 *    (it already is, by default, in run.py) so it accepts connections
 *    from other devices on the network, not just from itself.
 * 5. If you're using an Android EMULATOR (not a physical phone) instead,
 *    use 10.0.2.2 instead of your PC's IP — Android emulators map
 *    10.0.2.2 to the host machine automatically:
 *      export const API_BASE_URL = "http://10.0.2.2:5000/api";
 */

export const API_BASE_URL = "http://192.168.43.167:5000/api";
