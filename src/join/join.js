(() => {
  const code = document.getElementById('room-code');
  const name = document.getElementById('team-name');
  const join = document.getElementById('join-button');
  const login = document.getElementById('join-screen');
  const room = document.getElementById('room-screen');
  const question = document.getElementById('question-screen');
  const questionTitle = document.getElementById('question-title');
  const answers = [...document.querySelectorAll('.answers button')];
  const answerStatus = document.getElementById('answer-status');
  const label = document.getElementById('screen-label');
  const status = document.getElementById('demo-status');
  const replay = document.getElementById('replay');
  let phase = 'join';
  let questionTimer;

  function fill(input, value) {
    if (phase !== 'join') return;
    input.value = value;
    join.disabled = !code.value || !name.value;
    status.textContent = join.disabled
      ? code.value ? 'Toque no nome da equipe para preencher o exemplo.' : 'Toque no código da sala para preencher o exemplo.'
      : 'Tudo pronto! Aperte “Entrar na sala” para continuar.';
  }

  function enterRoom() {
    if (phase !== 'join' || join.disabled) return;
    phase = 'waiting';
    join.disabled = true;
    login.hidden = true;
    room.hidden = false;
    label.textContent = 'Na sala';
    status.textContent = 'Na sala · a pergunta aparecerá em instantes…';
    questionTimer = setTimeout(() => {
      phase = 'question';
      room.hidden = true;
      question.hidden = false;
      label.textContent = 'Na aula';
      status.textContent = 'Escolha uma das respostas da pergunta.';
      questionTitle.focus();
    }, 2200);
  }

  function selectAnswer(answer) {
    if (phase !== 'question') return;
    phase = 'answered';
    answer.classList.add('selected');
    answer.setAttribute('aria-pressed', 'true');
    answers.forEach(button => { button.disabled = true; });
    answerStatus.hidden = false;
    status.textContent = `Resposta ${answer.dataset.answer} selecionada · demonstração concluída`;
  }

  function reset() {
    clearTimeout(questionTimer);
    phase = 'join';
    code.value = '';
    name.value = '';
    join.disabled = true;
    login.hidden = false;
    room.hidden = true;
    question.hidden = true;
    answerStatus.hidden = true;
    answers.forEach(answer => {
      answer.disabled = false;
      answer.classList.remove('selected');
      answer.setAttribute('aria-pressed', 'false');
    });
    label.textContent = 'Entrar';
    status.textContent = 'Toque nos campos para preencher os exemplos.';
  }

  for (const event of ['click', 'focus']) {
    code.addEventListener(event, () => fill(code, 'K7Q24'));
    name.addEventListener(event, () => fill(name, 'Capivaras'));
  }
  join.addEventListener('click', enterRoom);
  answers.forEach(answer => answer.addEventListener('click', () => selectAnswer(answer)));
  replay.addEventListener('click', reset);
  reset();
})();
