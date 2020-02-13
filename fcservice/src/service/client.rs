////! Fcservice RPC Client

use crate::service::cache::{cache_get_nonce, cache_put_nonce};
use crate::service::error::RemoteNode::{EmptyNonce, InvalidNonce};
use crate::service::error::ServiceError;
use jsonrpc_core::Result as CoreResult;
use jsonrpc_core::{Id, MethodCall, Params, Response, Version};
use serde_json::value::Value;
use std::sync::atomic::{AtomicU64, Ordering};

static CALL_ID: AtomicU64 = AtomicU64::new(1);

pub async fn get_nonce(addr: &str) -> Result<u64, ServiceError> {
    if let Some(nonce) = cache_get_nonce(addr) {
        return Ok(nonce);
    }

    // FIXME: use configuration parameters instead
    let url = "https://lotus-dev.temporal.cloud/rpc/v0";
    let jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJBbGxvdyI6WyJyZWFkIiwid3JpdGUiLCJzaWduIiwiYWRtaW4iXX0.3kxS0ClOY8Knng4YEAKOkHPcVGvrh4ApKq8ChfYuPkE";

    let call_id = CALL_ID.fetch_add(1, Ordering::SeqCst);

    // Prepare request
    let m = MethodCall {
        jsonrpc: Some(Version::V2),
        method: "Filecoin.MpoolGetNonce".to_owned(),
        params: Params::Array(vec![Value::from(
            "t1jdlfl73voaiblrvn2yfivvn5ifucwwv5f26nfza",
        )]),
        id: Id::Num(call_id),
    };

    // Build request
    let client = reqwest::Client::new();
    let builder = client.post(url).bearer_auth(jwt).json(&m);

    // Send and wait for response
    let resp = builder.send().await?.json::<Response>().await?;

    // Handle response
    let nonce = match resp {
        Response::Single(o) => {
            // TODO: too many abstractions to get the result?
            let result = CoreResult::<Value>::from(o)?;
            result.as_u64().ok_or(EmptyNonce)?
        }
        _ => return Err(ServiceError::RemoteNode(InvalidNonce)),
    };

    cache_put_nonce(addr, nonce);
    Ok(nonce)
}
