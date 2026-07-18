(function() {
    // Wait until Events is defined (from network.js)
    function initUI() {
        if (typeof Events === 'undefined') {
            console.warn('ui.js: waiting for Events...');
            setTimeout(initUI, 100);
            return;
        }

        // ---------- All original UI code goes here ----------
        const $ = query => document.getElementById(query);
        const $$ = query => document.body.querySelector(query);
        const isURL = text => /^((https?:\/\/|www)[^\s]+)/g.test(text.toLowerCase());
        window.isDownloadSupported = (typeof document.createElement('a').download !== 'undefined');
        window.isProductionEnvironment = !window.location.host.startsWith('localhost');
        window.iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        // set display name
        Events.on('displayName', e => {
            $("displayName").textContent = "You are known as " + e.detail.message;
        });

        class PeersUI {
            // ... (all methods exactly as before, unchanged)
        }

        class PeerUI {
            // ... (all methods exactly as before, unchanged)
        }

        class Dialog {
            // ... (all methods exactly as before, unchanged)
        }

        class ReceiveDialog extends Dialog {
            // ... (with audio fix: window.blop.play().catch(() => {}))
        }

        class SendTextDialog extends Dialog {
            // ... (unchanged)
        }

        class ReceiveTextDialog extends Dialog {
            // ... (with audio fix)
        }

        class Toast extends Dialog {
            // ... (unchanged)
        }

        class Notifications {
            // ... (unchanged)
        }

        class NetworkStatusUI {
            // ... (unchanged)
        }

        class WebShareTargetUI {
            // ... (unchanged)
        }

        class Airdump {
            constructor() {
                const server = new ServerConnection();
                const peers = new PeersManager(server);
                const peersUI = new PeersUI();
                Events.on('load', e => {
                    const receiveDialog = new ReceiveDialog();
                    const sendTextDialog = new SendTextDialog();
                    const receiveTextDialog = new ReceiveTextDialog();
                    const toast = new Toast();
                    const notifications = new Notifications();
                    const networkStatusUI = new NetworkStatusUI();
                    const webShareTargetUI = new WebShareTargetUI();
                });
            }
        }

        const airdump = new Airdump();

        document.copy = text => {
            // ... (unchanged)
        };

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then(serviceWorker => {
                    console.log('Service Worker registered');
                    window.serviceWorker = serviceWorker
                });
        }

        window.addEventListener('beforeinstallprompt', e => {
            // ... (unchanged)
        });

        // Infinite Background Animation
        Events.on('load', () => {
            // ... (as provided earlier)
        });

        Notifications.PERMISSION_ERROR = `...`; // unchanged

        document.body.onclick = e => {
            document.body.onclick = null;
            if (!(/.*Version.*Safari.*/.test(navigator.userAgent))) return;
            blop.play().catch(() => {});
        };

        console.log('ui.js: initialized successfully');
    }

    // Start waiting
    initUI();
})();