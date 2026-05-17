# Changelog

## [1.4.0](https://github.com/rayhuang2006/Aceey/compare/v1.3.0...v1.4.0) (2026-05-17)


### Features

* **testcase:** implement initial two-pane layout and summary bar (WIP) ([1e2cdd9](https://github.com/rayhuang2006/Aceey/commit/1e2cdd94f20632c37158a5bce69d36cbcfd40f9e))
* **workspace:** implement draggable vertical resizer for dynamic panel sizing ([8752c61](https://github.com/rayhuang2006/Aceey/commit/8752c61edd518f6daff3ab91752f5f1f8185efb9))


### Bug Fixes

* **testcase:** correct v-if logic and complete flexbox height chain ([7ffa2cc](https://github.com/rayhuang2006/Aceey/commit/7ffa2cc71f93af86cd97b0d59029be57fd09b9e9))
* **testcase:** implement resilient flexbox scrolling and dark mode scrollbars ([dd80e10](https://github.com/rayhuang2006/Aceey/commit/dd80e10f2323bc346fb1c6d2c46977050cec099c))

## [1.3.0](https://github.com/rayhuang2006/Aceey/compare/v1.2.0...v1.3.0) (2026-05-17)


### Features

* **editor:** implement dual-mode markdown and latex rendering for problem panel ([4c1375f](https://github.com/rayhuang2006/Aceey/commit/4c1375fb440c8546c91729b77fedbaf61ac0f901))
* **sidebar:** implement robust markdown-it and texmath engine for flawless LaTeX rendering ([9cf7110](https://github.com/rayhuang2006/Aceey/commit/9cf7110f827d412b280b8995d8aad973e9913e41))

## [1.2.0](https://github.com/rayhuang2006/Aceey/compare/v1.1.1...v1.2.0) (2026-05-17)


### Features

* **calendar:** implement popover layout with training tasks support ([bf26484](https://github.com/rayhuang2006/Aceey/commit/bf26484c724e4733c0118ec803022e521eafd404))
* **ui:** enhance UX with transitions, loading states, and toast notifications ([b892ce7](https://github.com/rayhuang2006/Aceey/commit/b892ce753e06a3db602510cc08bd7fa6f0ecdfdb))


### Bug Fixes

* **calendar:** resolve Date parsing error and prevent loading deadlock in plan generation ([959f6f4](https://github.com/rayhuang2006/Aceey/commit/959f6f4ab6cfdf3a013d3a76e2e4ce1cebd21de7))
* **ui:** resolve z-index conflict and optimize popover UX ([e222057](https://github.com/rayhuang2006/Aceey/commit/e22205715b039991bc7f917a4070042c7b2c74bf))

## [1.1.1](https://github.com/rayhuang2006/Aceey/compare/v1.1.0...v1.1.1) (2026-05-09)


### Bug Fixes

* sync tauri versions to unblock release build ([f68134a](https://github.com/rayhuang2006/Aceey/commit/f68134acb532f1b89f13a5e834f88e34c1bc1a88))

## [1.1.0](https://github.com/rayhuang2006/Aceey/compare/v1.0.2...v1.1.0) (2026-05-09)


### Features

* complete massive Vue 3 migration and restore all UI/UX logic ([9acc4b5](https://github.com/rayhuang2006/Aceey/commit/9acc4b5f3d20a3c439e4b21d9df52e289abc4a78))

## [1.0.2](https://github.com/rayhuang2006/Aceey/compare/v1.0.1...v1.0.2) (2026-05-09)


### Bug Fixes

* **build:** add missing app icons to tauri config. Closes [#6](https://github.com/rayhuang2006/Aceey/issues/6) ([b6a9fa1](https://github.com/rayhuang2006/Aceey/commit/b6a9fa126c0fd5d388c9fbf2a5d860136407392a))
* **build:** add missing app icons to tauri config. Closes [#6](https://github.com/rayhuang2006/Aceey/issues/6) ([92fb7c0](https://github.com/rayhuang2006/Aceey/commit/92fb7c07221df73bc7a2ea2f8c8dc58fd9ed21ed))

## [1.0.1](https://github.com/rayhuang2006/Aceey/compare/v1.0.0...v1.0.1) (2026-05-09)


### Bug Fixes

* **build:** update bundle identifier to com.rayhuang.aceey to enable dmg bundling ([5d7f590](https://github.com/rayhuang2006/Aceey/commit/5d7f5907bf5a8b890da54d11588235c99a923d63))

## 1.0.0 (2026-05-09)


### Features

* add contest calendar with Clist.by API ([6cd912c](https://github.com/rayhuang2006/Aceey/commit/6cd912cdc82a29205a753353083dead63bb5c108))
* agent workflow - training plan generator with calendar integration ([9086e08](https://github.com/rayhuang2006/Aceey/commit/9086e080eaf5f817ad011c2bb74d0c4c2db941d7))
* **agent:** implement backend local memory, XAI panel, and VS Code UI ([cd46cc1](https://github.com/rayhuang2006/Aceey/commit/cd46cc1d953508548bfdaa183175680982b5f5ac))
* **agent:** implement token usage interception and local persistence in rust ([ed21679](https://github.com/rayhuang2006/Aceey/commit/ed2167923f04acd329318b5a1dd38bfb8213bbe3))
* calendar grid view + Groq AI practice suggestion ([08040c4](https://github.com/rayhuang2006/Aceey/commit/08040c4cef750afc74bc1a5b2735dc12e58f8eff))
* CSES problem links + training plan fixes ([600b887](https://github.com/rayhuang2006/Aceey/commit/600b8875bfc213a906ce9c937fdc5a0c8d98768d))
* debug agent with Monaco decorations and sequential hints ([af92940](https://github.com/rayhuang2006/Aceey/commit/af9294028e19487f84ad0d5f1ce4c36c2300ca4f))
* **finops:** integrate rust token usage with dynamic frontend ui ([b8ab800](https://github.com/rayhuang2006/Aceey/commit/b8ab800a6f1a755aa9a2a644622829dc4ba5f3a6))
* **settings:** integrate tauri-plugin-store and fix agent trigger sync ([ca523a3](https://github.com/rayhuang2006/Aceey/commit/ca523a3fa6bda620b8514e7dd2688e414a44d0a5))
* **ui:** implement FinOps settings tab and two-way binding slider ([52b984e](https://github.com/rayhuang2006/Aceey/commit/52b984ea76b197b132d8af9bb53545a61704293f))
* **ui:** implement VS Code style status bar and token quota hover panel ([958f4a1](https://github.com/rayhuang2006/Aceey/commit/958f4a11a3373316790703556de59198641235d6))
* **ui:** refactor quota hover panel to read-only progress bar ([c66c620](https://github.com/rayhuang2006/Aceey/commit/c66c6205d4d7ad3d0d9d57908eba2851601cbc2e))


### Bug Fixes

* **core:** grant tauri store permissions and implement robust state sync ([a9907da](https://github.com/rayhuang2006/Aceey/commit/a9907da63a5feddcf519589d977f7445d2a94e73))
* prevent ZoneWidget from being clipped at the bottom ([7319823](https://github.com/rayhuang2006/Aceey/commit/73198235b1782a9cc76b3448c7dfa2d9c0dfa179))
