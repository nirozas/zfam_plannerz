import './PWABadge.css'
import { useRegisterSW } from 'virtual:pwa-register/react'

function PWABadge() {
    const period = 60 * 60 * 1000 // 1 hour

    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, r) {
            if (period > 0 && r && r.installing) {
                r.installing.addEventListener('statechange', (e) => {
                    const sw = e.target as ServiceWorker
                    if (sw.state === 'activated')
                        console.log('SW activated')
                })
            }
            if (swUrl && r) {
                setInterval(async () => {
                    if (!(!r.installing && navigator))
                        return

                    if (('connection' in navigator) && !navigator.onLine)
                        return

                    const resp = await fetch(swUrl, {
                        cache: 'no-cache',
                        headers: {
                            'cache': 'no-cache',
                            'cache-control': 'no-cache',
                        },
                    })

                    if (resp?.status === 200)
                        await r.update()
                }, period)
            }
        },
    })

    function close() {
        setOfflineReady(false)
        setNeedRefresh(false)
    }

    if (!(offlineReady || needRefresh)) return null;

    return (
        <div className="pwa-badge" role="alert" aria-labelledby="toast-label">
            <div className="pwa-toast">
                <div className="pwa-message">
                    {offlineReady ? (
                        <span id="toast-label">App ready to work offline</span>
                    ) : (
                        <span id="toast-label">New content available, click on reload button to update.</span>
                    )}
                </div>
                <div className="pwa-buttons">
                    {needRefresh && (
                        <button className="pwa-toast-button" onClick={() => updateServiceWorker(true)}>
                            Reload
                        </button>
                    )}
                    <button className="pwa-toast-button" onClick={() => close()}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

export default PWABadge
