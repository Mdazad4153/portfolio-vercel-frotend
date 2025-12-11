# Session CSS Enhancement Snippet
# Copy and paste this at the end of admin.css file

```css
/* ========================================
   ENHANCED SESSION MANAGEMENT CARDS
   ======================================== */

.session-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    margin-bottom: 16px;
    transition: all var(--transition-normal);
    position: relative;
    overflow: hidden;
}

.session-card:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.session-card.current-session {
    border-color: var(--success);
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(16, 185, 129, 0.05) 100%);
}

.current-badge {
    position: absolute;
    top: 16px;
    right: 16px;
    background: var(--success);
    color: white;
    padding: 6px 12px;
    border-radius: var(--radius-full);
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
}

.session-header {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
}

.session-icon-wrapper {
    position: relative;
    flex-shrink: 0;
}

.session-device-icon {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    transition: var(--transition-fast);
}

.session-device-icon.mobile {
    background: linear-gradient(135deg, #f59e0b, #f97316);
    color: white;
}

.session-device-icon.tablet {
    background: linear-gradient(135deg, #8b5cf6, #a855f7);
    color: white;
}

.session-device-icon.desktop {
    background: linear-gradient(135deg, var(--primary), var(--accent));
    color: white;
}

.session-card:hover .session-device-icon {
    transform: scale(1.1) rotate(5deg);
}

.browser-badge {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    border: 2px solid var(--bg-card);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.browser-badge.chrome {
    background: linear-gradient(135deg, #4285F4, #34A853);
    color: white;
}

.browser-badge.firefox {
    background: linear-gradient(135deg, #FF7139, #E66000);
    color: white;
}

.browser-badge.edge {
    background: linear-gradient(135deg, #0078D7, #00BCF2);
    color: white;
}

.browser-badge.safari {
    background: linear-gradient(135deg, #00A2E8, #52C1FA);
    color: white;
}

.browser-badge.opera {
    background: linear-gradient(135deg, #FF1B2D, #FA3E3E);
    color: white;
}

.browser-badge.default {
    background: var(--bg-elevated);
    color: var(--text-secondary);
}

.session-info {
    flex: 1;
    min-width: 0;
}

.session-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.session-details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
}

.detail-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    padding: 8px 12px;
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    transition: var(--transition-fast);
}

.detail-item:hover {
    background: var(--primary-light);
    color: var(--primary);
}

.detail-item i {
    width: 16px;
    text-align: center;
    color: var(--primary);
    opacity: 0.6;
}

.detail-item strong {
    font-weight: 600;
    color: var(--text-muted);
    margin-right: 4px;
}

.session-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
}

.session-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: var(--radius-full);
}

.session-status.active {
    background: rgba(16, 185, 129, 0.1);
    color: var(--success);
}

.session-status.active i {
    animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
50% { opacity: 0.3; }
}

.session-status.inactive {
    background: var(--bg-elevated);
    color: var(--text-secondary);
}

.session-loading {
    text-align: center;
    padding: 48px 24px;
}

.session-loading p {
    margin-top: 16px;
    color: var(--text-muted);
    font-size: 14px;
}

@media (max-width: 768px) {
    .session-details-grid {
        grid-template-columns: 1fr;
    }
    
    .session-header {
        flex-direction: column;
        align-items: center;
        text-align: center;
    }
    
    .session-footer {
        flex-direction: column;
        gap: 12px;
    }
    
    .current-badge {
        position: static;
        margin-bottom: 12px;
        align-self: center;
    }
}
```
