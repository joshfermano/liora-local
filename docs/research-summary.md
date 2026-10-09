# Research summary

Deep research run on 2026-10-09: 5 search angles, 23 sources fetched, 115 claims extracted, 25
verified by 3-vote adversarial checking (15 confirmed, 10 refuted). Confidence and votes are shown
per finding.

## Safe to quote in the pitch

1. **Family planning gap** (high, 3-0). 2022 NDHS: 12% of married women and 42% of sexually active
   unmarried women had an unmet need for family planning. Modern method use: 42% married, 24%
   unmarried; BARMM lowest at about 21%. Source: UNFPA Philippines Country Programme Document,
   cross-checked against the 2022 NDHS Key Indicators Report.
   https://digitallibrary.un.org/record/4035724/files/DP_FPA_CPD_PHL_9-EN.pdf
2. **Disasters close maternal care** (medium, 3-0). After the late-2024 storms, birthing facilities
   in Bato, Bula and Nabua (Camarines Sur) closed temporarily; flooding damaged equipment,
   medicines, family-planning supplies and emergency transport. Source: UNFPA Philippines
   Situation Report #1, 5 Dec 2024.
   https://unfpa.org/sites/default/files/resource-pdf/UNFPA%20Philippines%20Situation%20Report%20%231_%20Overlapping%20Tropical%20Cyclones.pdf
3. **Perinatal depression** (medium, 3-0). Filoteo et al., BMJ Open 16(2):e109079, Feb 2026: 69.1%
   of pregnant and 62.0% of postpartum respondents scored 13 or more on the EPDS; only 2 of 500
   postpartum respondents had received counselling or therapy. **Not nationally representative**
   (mostly recruited via Facebook ads); present it as a high screening result, not prevalence.
   https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12918685/

## Technical findings

4. **WHO decision logic exists as deterministic tables** (high, 3-0). WHO ANC Digital Adaptation
   Kit (2021) is "software-neutral" with 35+ IF/THEN decision tables (Web Annex B). The SMART ANC
   repo encodes them as CQL. About 20% needs local (DOH) adaptation; value sets are marked draft;
   some DAK content is CC BY-NC-SA. https://www.who.int/publications/i/item/9789240020306 and
   https://github.com/WorldHealthOrganization/smart-anc
5. **ANC.DT.01 danger signs** (medium, 2-1). Any one triggers urgent referral: vaginal bleeding,
   convulsing, fever, severe headache, visual disturbance, imminent delivery, labour, looks very
   ill, severe vomiting, severe pain, severe abdominal pain, unconscious; central cyanosis is a
   separate branch (13 total). It is a health-worker check, covers no postpartum signs and omits
   lay signs such as reduced fetal movement. DT.06 adds oximetry under 92%; DT.17 adds BP 160/110
   or more with proteinuria.
6. **Gemma-class speeds** (high, vendor best case). Gemma 3n E2B int4: ~16 tok/s decode on a
   Galaxy S24 Ultra CPU; 47.6 tok/s decode in Chrome on an M4 GPU via MediaPipe. Not our runtime
   and not our devices: do not quote. Gemma 3n E2B is marked deprecated in favour of Gemma 4 E2B.
7. **"Jev" is TypeSafe AI's decision model, not Meta's JEPA** (the earlier JEPA guess is
   withdrawn; the user named TypeSafe on 2026-10-09). Medium confidence, from launch coverage and
   guides rather than TypeSafe's own docs: Jev entered early access on 15 Sep 2026, answers typed
   questions (choice, score, yes/no) with a confidence instead of generating text, and runs only as
   a cloud service. Its speed and cost claims ("193.6x faster") are the vendor's: do not quote.
   https://typesafe.ai/ and https://www.datacamp.com/blog/top-open-source-jev-alternatives

## Local model findings (checked 2026-10-09 evening, for spec v4)

8. **Gemma 4 E2B runs in the browser through Transformers.js.** Apache-2.0 (Hugging Face card
   metadata). 2.3B effective parameters (5.1B with embeddings); text, image and audio input, with
   speech recognition on E2B and E4B; 128K context; 35+ languages out of the box, pre-trained on
   140+. `onnx-community/gemma-4-E2B-it-ONNX` file sizes: decoder q4f16 1,520 MB; token embeddings
   int8 466 MB or q4f16 1,591 MB; audio encoder q4f16 172 MB; vision encoder q4f16 99 MB. A 2-bit
   `gemma-4-E2B-it-qat-mobile-ONNX` build has a 995 MB decoder and 1,297 MB embeddings. Google's
   LiteRT-LM web build is text-only. Whether any of it fits Safari's memory on the iPhones is
   unknown until S1. https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX
9. **Runtimes.** Transformers.js 4.3.1 (released 2026-10-07) contains `gemma4`,
   `embedding_gemma2` and `modernbert`. WebLLM 0.2.85's prebuilt list has no Gemma 4; its newest
   Gemma is `gemma3-1b-it-q4f16_1-MLC`. Checked in both GitHub repos.
10. **EmbeddingGemma 2** (Apache-2.0): text, images, video and audio in one 768-d space, 100+
    languages, Matryoshka truncation to 128, 256 or 512, 8K context; a 270M text backbone with
    separately loadable vision (170M) and audio (300M) encoders. `onnx-community/embeddinggemma-2-ONNX`
    file sizes: text q4f16 157 MB, vision q4f16 98 MB. `jinaai/jina-clip-v2` is CC BY-NC 4.0, so it
    is not used. https://huggingface.co/google/embeddinggemma-2
11. **Open Jev alternatives** (DataCamp guide, Sep 2026): Laya, Nimble, Kev, SemIf, Rizzo Flow, Von
    and NanoJev. Only Laya and the SemIf method suit a phone browser; the others are 0.6B to 9B and
    run as GPU or local servers. **Laya** (`NandhaKishorM/laya`, Apache-2.0): `laya-multilingual`
    is 322M (mmBERT), 100+ languages, with a browser runner `laya-ts` (split ONNX, WebGPU with WASM
    fallback; not published on npm). Its BENCHMARKS.md reports Tagalog (MASSIVE intent, 20 options)
    at 0.350 accuracy with calibration error 0.430, so zero-shot Tagalog is weak. **SemIf**
    (`TheoLeeCJ/SemIf-OpenJev`, MIT) reads option probabilities from an existing open model with no
    training. Do not quote any of these projects' speeds or accuracies as ours.

## Refuted or unverified: do NOT quote

- Philippine maternal mortality ratio (~144 per 100,000): refuted 1-2.
- Facility-delivery gaps and distance as the top barrier: refuted 0-3.
- Bicol counts of affected pregnant women: refuted 0-3.
- MISP training gap: refuted 0-3.
- Noora Health "LLM extracts, rules decide" recall results (arXiv 2609.09356): refuted 1-2 and 0-3.
- Offline nurse-midwife RAG on Android (alphaxiv 2606.29580, withdrawn): refuted 0-3.
- ExecuTorch Qwen3 file sizes: refuted 0-3.
- Anything about teen pregnancy, GIDA connectivity, youth HIV, anemia, VAW or BHW numbers: not
  verified.
- On-device Tagalog/Cebuano speech accuracy: not verified. Measure it ourselves.
- "Nobody has built this before": not verified.

## Open questions the build must answer by measurement

- Real speed, memory and stability of the candidate models in Safari on the two iPhones.
- Whisper accuracy on Taglish symptom descriptions.
- Whether the model cache survives closing Safari and airplane mode, and inside a Home Screen web
  app.
- Whether Gemma 4 E2B (q4f16 or 2-bit) fits Safari's memory on the iPhone 17 and 17 Pro.
- Gemma 4's speech accuracy on Taglish compared with Whisper base.
- How well typed-decision confidences are calibrated on Taglish symptom messages.
