const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export const isOpenAIConfigured = !!API_KEY;

async function chat(messages, { model = "gpt-4o-mini", maxTokens = 800 } = {}) {
  if (!API_KEY) throw new Error("OpenAI API 키가 설정되지 않았습니다.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI 오류 (${res.status})`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// ── 프로젝트 파일 분석 → 할 일 목록 생성 ────────────────────────────
export async function analyzeProjectWithAI(content, filename) {
  const prompt = `다음은 "${filename}" 파일의 내용이야. 이 프로젝트를 분석해서 JSON으로 응답해줘.

파일 내용:
\`\`\`
${content.slice(0, 3000)}
\`\`\`

다음 형식의 JSON만 응답 (다른 텍스트 없이):
{
  "name": "프로젝트 이름",
  "description": "한 줄 설명 (한국어, 50자 이내)",
  "stack": ["기술1", "기술2"],
  "tasks": [
    "구체적인 할 일 1",
    "구체적인 할 일 2"
  ],
  "priority": "high|medium|low",
  "room": "lab|office|server|ceo|lounge|meeting|storage"
}

tasks는 이 프로젝트에서 실제로 해야 할 일 5~8개를 구체적으로 (한국어로) 작성해.`;

  const raw = await chat([{ role: "user", content: prompt }]);

  // JSON 파싱
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI 응답 파싱 실패");
  return JSON.parse(match[0]);
}

// ── 프로젝트 설명 → 추가 할 일 제안 ─────────────────────────────────
export async function suggestTasks(project) {
  const prompt = `프로젝트 정보:
- 이름: ${project.name}
- 설명: ${project.description || "없음"}
- 스택: ${(project.stack || []).join(", ") || "미정"}
- 상태: ${project.status}
- 현재 완료된 태스크: ${project.tasks?.filter(t => t.done).map(t => t.text).join(", ") || "없음"}
- 미완료 태스크: ${project.tasks?.filter(t => !t.done).map(t => t.text).join(", ") || "없음"}

이 프로젝트에서 추가로 해야 할 구체적인 할 일 5개를 한국어로 제안해줘.
JSON 배열만 응답 (다른 텍스트 없이):
["할 일 1", "할 일 2", "할 일 3", "할 일 4", "할 일 5"]`;

  const raw = await chat([{ role: "user", content: prompt }]);
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("AI 응답 파싱 실패");
  return JSON.parse(match[0]);
}

// ── 프로젝트 포폴 설명 자동 생성 ─────────────────────────────────────
export async function generateDescription(project) {
  const prompt = `다음 프로젝트의 포트폴리오용 한 줄 설명을 한국어로 작성해줘 (50자 이내, 명사형 종결):
- 이름: ${project.name}
- 스택: ${(project.stack || []).join(", ")}
- 상태: ${project.status}

설명만 답해줘 (따옴표 없이).`;

  return await chat([{ role: "user", content: prompt }], { maxTokens: 100 });
}
