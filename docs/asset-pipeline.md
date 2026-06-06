# Asset Pipeline

Studio treats assets as prompt-managed records. The runtime can play without final images, but every rich project carries the prompt data needed for a production pass.

## Asset Types

- `background`
- `character_portrait`
- `character_variant`
- `cg_cutscene`
- `ui_overlay`
- `evidence_item`
- `gameplay_hook_concept`

## Required Fields

Each asset has an id, type, title, description, prompt, aspect ratio, target device usage, status, and optional linked scenes or characters.

## Status Values

- `needed`
- `prompted`
- `generated`
- `approved`
- `replaced`

## Prompt Practice

Use stable asset ids as the project API. Prompts should describe subject, lighting, camera, style, aspect ratio, and forbidden text/logos. Evidence props should avoid real brands, real private data, and real case material.

## Validation

Validation catches broken asset ids in scenes, hooks, items, story assets, and linked scene/character lists.
