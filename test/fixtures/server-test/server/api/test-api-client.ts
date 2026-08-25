import { useLettermintApi } from '#imports'

export default defineEventHandler(async () => {
  try {
    const api = useLettermintApi()

    return {
      success: true,
      team: await api.team.retrieve(),
      ping: await api.ping(),
    }
  }
  catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    }
  }
})
