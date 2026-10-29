import { t } from '../../i18n/index.js';
import { ORDER_FLOW, ORDER_STATUS } from '../../utils/constants.js';
import { formatTime } from '../../utils/format.js';
import { CheckIcon, CloseIcon } from '../icons/Icons.jsx';
import { cx } from '../../utils/format.js';
import s from './StatusTimeline.module.css';

/**
 * StatusTimeline — vertical list of order steps with times.
 * Props:
 *  - status: current order status (ORDER_STATUS)
 *  - history: Array<{ status, at: ISO string }> — from order.statusHistory
 *  - extra: ReactNode shown under the CANCELLED step (e.g. the shop's reason)
 */
export default function StatusTimeline({ status, history = [], extra }) {
  const timeOf = Object.fromEntries(history.map((h) => [h.status, h.at]));
  const isTerminal = status === ORDER_STATUS.CANCELLED;
  const currentIndex = ORDER_FLOW.indexOf(status);

  // For cancelled orders show only the steps that happened, then the end step.
  const steps = isTerminal
    ? [...ORDER_FLOW.filter((st) => timeOf[st]), status]
    : ORDER_FLOW;

  return (
    <ol className={s.timeline} aria-label={t('timeline.title')}>
      {steps.map((step, i) => {
        const failed = isTerminal && step === status;
        const done = failed || timeOf[step] || (!isTerminal && i <= currentIndex);
        const current = !isTerminal && i === currentIndex && status !== ORDER_STATUS.DELIVERED;
        const time = timeOf[step];
        return (
          <li
            key={step}
            className={cx(s.step, done && s.done, current && s.current, failed && s.failed)}
            aria-current={current || failed ? 'step' : undefined}
          >
            <span className={s.dot} aria-hidden="true">
              {failed ? <CloseIcon size={16} strokeWidth={3} /> : done && !current ? <CheckIcon size={16} strokeWidth={3} /> : null}
            </span>
            <div className={s.text}>
              <span className={s.label}>{t(`timeline.${step}`)}</span>
              <span className={s.time}>{time ? formatTime(time) : !done ? t('timeline.pending') : ''}</span>
              {failed && extra && <div className={s.extra}>{extra}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
