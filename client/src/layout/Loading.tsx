
import styles from './Loading.module.scss'

const Loading = () => {
  return (
    <div className={styles.container} role={'status'} aria-live={'polite'}>
      <div className={styles.loader} aria-hidden={true}>
        <div className={styles.tech__devices}>
          <span className={styles.tech__device}>
            <i className={styles.tech__watch} />
          </span>
          <span
            className={[
              styles.tech__device,
              styles['tech__device--laptop'],
            ].join(' ')}
          >
            <i className={styles.tech__laptop} />
          </span>
          <span
            className={[
              styles.tech__device,
              styles['tech__device--headphones'],
            ].join(' ')}
          >
            <i className={styles.tech__headphones} />
          </span>
        </div>
        <span className={styles.tech__track}>
          <span className={styles.tech__signal} />
        </span>
      </div>
      <span className={styles['sr-only']}>Loading</span>
    </div>
  )
}

export default Loading
