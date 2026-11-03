// Background lease heartbeats are not visible record changes.
export const syncRenderKey=state=>JSON.stringify({items:(state.items||[]).map(e=>[e.operationId,e.status,e.error,e.confirmedAt,e.writeAck?.recordId,e.result?.recordId]),mappings:state.mappings||{},readAt:state.snapshot?.readAt});
