import { RELEASE_NOTES } from '../data/appInfo';

interface ReleaseNotesModalProps {
  onClose: () => void;
}

function ReleaseNotesModal({ onClose }: ReleaseNotesModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal modal--tall">
        <div className="modal__header">
          <h3 className="modal__title">更新履歴</h3>
          <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>
            閉じる
          </button>
        </div>

        <div className="release-notes__list">
          {RELEASE_NOTES.map((note, index) => (
            <div key={note.version} className="release-notes__item">
              <div className="release-notes__item-header">
                <span className="release-notes__version">
                  Ver.{note.version}｜{note.date}
                </span>
                {index === 0 && <span className="release-notes__new-badge">NEW</span>}
              </div>
              <ul className="release-notes__changes">
                {note.changes.map((change, changeIndex) => (
                  <li key={changeIndex}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReleaseNotesModal;
