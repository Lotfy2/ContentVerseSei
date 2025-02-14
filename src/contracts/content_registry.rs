use cosmwasm_std::{
    entry_point, to_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
    Order, StdError, Storage,
};
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

// State
pub const CONFIG: Item<Config> = Item::new("config");
pub const CONTENT: Map<&str, Content> = Map::new("content");
pub const CONTENT_COUNT: Item<u64> = Item::new("content_count");

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Config {
    pub owner: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    pub owner: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Content {
    pub owner: String,
    pub title: String,
    pub description: String,
    pub content_type: String,
    pub content_hash: String,
    pub target_languages: Vec<String>,
    pub translations: Vec<Translation>,
    pub created_at: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Translation {
    pub language: String,
    pub content_hash: String,
    pub translator: String,
    pub created_at: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    RegisterContent {
        title: String,
        description: String,
        content_type: String,
        content_hash: String,
        target_languages: Vec<String>,
    },
    AddTranslation {
        content_id: String,
        language: String,
        content_hash: String,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    GetContent { content_id: String },
    ListContent { start_after: Option<String>, limit: Option<u32> },
    GetContentByOwner { owner: String },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ContentResponse {
    pub content: Content,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ContentListResponse {
    pub contents: Vec<Content>,
}

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> StdResult<Response> {
    let config = Config {
        owner: msg.owner,
    };
    CONFIG.save(deps.storage, &config)?;
    CONTENT_COUNT.save(deps.storage, &0u64)?;

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("owner", info.sender))
}

pub fn execute_register_content(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    title: String,
    description: String,
    content_type: String,
    content_hash: String,
    target_languages: Vec<String>,
) -> StdResult<Response> {
    let mut count = CONTENT_COUNT.load(deps.storage)?;
    count += 1;
    let content_id = count.to_string();

    let content = Content {
        owner: info.sender.to_string(),
        title,
        description,
        content_type,
        content_hash,
        target_languages,
        translations: vec![],
        created_at: env.block.time.seconds(),
    };

    CONTENT.save(deps.storage, &content_id, &content)?;
    CONTENT_COUNT.save(deps.storage, &count)?;

    Ok(Response::new()
        .add_attribute("method", "register_content")
        .add_attribute("content_id", content_id)
        .add_attribute("owner", info.sender))
}

pub fn execute_add_translation(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    content_id: String,
    language: String,
    content_hash: String,
) -> StdResult<Response> {
    let mut content = CONTENT.load(deps.storage, &content_id)?;

    // Verify the language is in target languages
    if !content.target_languages.contains(&language) {
        return Err(StdError::generic_err("Language not in target languages"));
    }

    // Check if translation already exists
    if content.translations.iter().any(|t| t.language == language) {
        return Err(StdError::generic_err("Translation already exists"));
    }

    let translation = Translation {
        language: language.clone(),
        content_hash,
        translator: info.sender.to_string(),
        created_at: env.block.time.seconds(),
    };

    content.translations.push(translation);
    CONTENT.save(deps.storage, &content_id, &content)?;

    Ok(Response::new()
        .add_attribute("method", "add_translation")
        .add_attribute("content_id", content_id)
        .add_attribute("language", language))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> StdResult<Response> {
    match msg {
        ExecuteMsg::RegisterContent {
            title,
            description,
            content_type,
            content_hash,
            target_languages,
        } => execute_register_content(
            deps,
            env,
            info,
            title,
            description,
            content_type,
            content_hash,
            target_languages,
        ),
        ExecuteMsg::AddTranslation {
            content_id,
            language,
            content_hash,
        } => execute_add_translation(deps, env, info, content_id, language, content_hash),
    }
}

fn query_content(deps: Deps, content_id: String) -> StdResult<ContentResponse> {
    let content = CONTENT.load(deps.storage, &content_id)?;
    Ok(ContentResponse { content })
}

fn list_content(
    deps: Deps,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<ContentListResponse> {
    let limit = limit.unwrap_or(30) as usize;
    let start = start_after.map(|s| s.as_bytes());

    let contents: StdResult<Vec<Content>> = CONTENT
        .range(deps.storage, start, None, Order::Ascending)
        .take(limit)
        .map(|item| {
            let (_, content) = item?;
            Ok(content)
        })
        .collect();

    Ok(ContentListResponse {
        contents: contents?,
    })
}

fn query_content_by_owner(deps: Deps, owner: String) -> StdResult<ContentListResponse> {
    let contents: StdResult<Vec<Content>> = CONTENT
        .range(deps.storage, None, None, Order::Ascending)
        .filter(|r| match r {
            Ok((_, content)) => content.owner == owner,
            Err(_) => false,
        })
        .map(|item| {
            let (_, content) = item?;
            Ok(content)
        })
        .collect();

    Ok(ContentListResponse {
        contents: contents?,
    })
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetContent { content_id } => to_binary(&query_content(deps, content_id)?),
        QueryMsg::ListContent { start_after, limit } => {
            to_binary(&list_content(deps, start_after, limit)?)
        },
        QueryMsg::GetContentByOwner { owner } => {
            to_binary(&query_content_by_owner(deps, owner)?)
        }
    }
}