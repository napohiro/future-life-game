import type { BranchRoute, PendingBranchChoice } from '../types/game';

interface RouteChoiceModalProps {
  pendingBranchChoice: PendingBranchChoice;
  onChoose: (route: BranchRoute) => void;
}

/** 人生の分岐点（18・30・45・60歳）に到達したときに出す、簡易なルート選択モーダル。
 * Ver.1.0では選んだルートは player.currentRoute / chosenRoutes に記録され、軽いフレーバー効果が付くのみ。
 * 本格的な経路分岐は将来の拡張とする。 */
function RouteChoiceModal({ pendingBranchChoice, onChoose }: RouteChoiceModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal modal--branch">
        <div className="modal__badge">🔀 人生の分岐点</div>
        <h3 className="modal__title">{pendingBranchChoice.branchName}</h3>
        <p className="modal__description">
          {pendingBranchChoice.playerName}さん、これからの道を選びましょう。
        </p>
        <div className="modal__choices">
          {pendingBranchChoice.routes.map((route) => (
            <button
              key={route.id}
              type="button"
              className="btn btn--primary route-choice-button"
              onClick={() => onChoose(route)}
            >
              <span className="route-choice-button__icon">{route.icon}</span>
              <span className="route-choice-button__text">
                <span className="route-choice-button__name">{route.name}</span>
                <span className="route-choice-button__description">{route.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RouteChoiceModal;
