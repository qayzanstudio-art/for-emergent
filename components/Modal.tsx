
import React from 'react';
import type { ModalState } from '../types';

interface ModalProps extends ModalState {
    onClose: () => void;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, title, body, confirmText = 'OK', cancelText = 'Batal', onConfirm, onClose, hideButtons = false }) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        // Close the current modal first, then execute the confirmation logic
        // This allows onConfirm to trigger a NEW modal (like the success screen)
        onClose();
        if (onConfirm) onConfirm();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity duration-300">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 scale-100 opacity-100 border-4 border-[#146b61]">
                <div className="p-6 text-on-secondary">
                    <h3 className="title-retro text-xl mb-4 border-b-2 border-dashed border-[#146b61] pb-2">{title}</h3>
                    <div className="retro-typewriter">{body}</div>
                </div>
                {!hideButtons && (
                    <div className="bg-gray-100 px-6 py-3 flex justify-end gap-3 rounded-b-lg">
                        <button onClick={onClose} className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition">{cancelText}</button>
                        <button onClick={handleConfirm} className="btn-retro bg-[#146b61] text-white font-bold py-2 px-6 rounded-lg hover:bg-[#0a3d38] transition">{confirmText}</button>
                    </div>
                )}
            </div>
        </div>
    );
};
