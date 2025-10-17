import pino from 'pino'

const logger = pino()

async function main() {
  logger.info('Worker service started')

  // Worker logic will be implemented here
}

main().catch((error) => {
  logger.error(error, 'Worker failed')
  process.exit(1)
})