export async function saveCalculationAction(payload: any) {
  return { success: true, data: payload };
}

export async function incrementPlotCountAction() {
  return { success: true };
}

export async function getCalculationsAction(query?: any) {
  return { success: true, data: [] };
}

export async function getCalculationByIdAction(id: string) {
  return { success: true, data: null };
}

export async function deleteCalculationAction(id: string) {
  return { success: true };
}

