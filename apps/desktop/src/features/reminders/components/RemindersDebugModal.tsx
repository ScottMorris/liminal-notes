import React, { useEffect, useState } from 'react';
import { useReminders } from '../../../contexts/RemindersContext';
import { XMarkIcon, RefreshIcon } from '../../../components/Icons';

export const RemindersDebugModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { getDebugInfo } = useReminders();
    const [info, setInfo] = useState<any>(null);

    const load = () => {
        setInfo(null);
        getDebugInfo().then(setInfo);
    };

    useEffect(() => {
        load();
    }, [getDebugInfo]);

    return (
        <div
            className="modal-overlay"
            onClick={(e) => {
                // Prevent bubbling to parent modals (e.g., Settings)
                e.stopPropagation();
                if (e.target === e.currentTarget) onClose();
            }}
        >
           <div
                className="modal-content"
                style={{ maxWidth: '800px', width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
                onClick={(e) => e.stopPropagation()}
           >
               <div className="modal-header">
                   <h2>Reminders Debug</h2>
                   <div style={{ display: 'flex', gap: '10px' }}>
                       <button className="reset-btn" onClick={load}><RefreshIcon /></button>
                       <button className="reset-btn" onClick={onClose}><XMarkIcon /></button>
                   </div>
               </div>
               <div className="modal-body" style={{ flex: 1, overflow: 'auto' }}>
                   {info ? (
                       <pre style={{ fontSize: '0.8em', whiteSpace: 'pre-wrap' }}>
                           {JSON.stringify(info, null, 2)}
                       </pre>
                   ) : (
                       <div>Loading...</div>
                   )}
               </div>
           </div>
        </div>
    );
};
