export const responseSucess = (statusCode: number, data: any, message: string) => {
  return {
    statusCode,
    body: JSON.stringify({
        message: message,
        data: data
    }),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Adjust as needed for CORS
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', // Adjust as needed
      'Access-Control-Allow-Headers': 'Content-Type, Authorization' // Adjust as needed
    }
  };
}

export const responseError = (statusCode: number, message: string) => {
  return {
    statusCode,
    body: JSON.stringify({
        error: message
    }),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Adjust as needed for CORS
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', // Adjust as needed
      'Access-Control-Allow-Headers': 'Content-Type, Authorization' // Adjust as needed
    }
  };
}