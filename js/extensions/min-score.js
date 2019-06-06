window.UgwishaExtensions.register((() => {
  function calculate() {
    const result = Math.round((minimum.value - current.value * (1 - worth.value)) / worth.value * 10000) / 100;
    if (result < 0) {
      output.innerHTML = `Even if you score 0%, <em class="min-score-emphasis">you'll be fine</em>.`;
    } else if (worth === 0 || isNaN(result)) {
      output.innerHTML = `Please don't enter so many zeroes.`;
    } else {
      output.innerHTML = `You need to score at least <em class="min-score-emphasis">${result}%</em> to keep your parents happy.`;
      if (result > 100) output.innerHTML += ` If there's no extra credit, you're screwed.`;
    }
  }
  const badChars = /[^0-9.]|\.(?=[^.]*\.)/g;
  function createInput(label, defaultValue, id) {
    const input = Elem('input', {
      className: 'basic-input min-score-input',
      value: defaultValue,
      id: id,
      onkeypress(e) {
        let char = String.fromCharCode(e.charCode);
        if (!'0123456789.'.includes(char)) {
          e.preventDefault();
          return false;
        }
      },
      oninput(e) {
        if (badChars.test(input.value)) {
          input.value = +input.value.replace(badChars, '') || 0;
        }
        calculate();
      },
      onchange(e) {
        input.value = +input.value.replace(badChars, '') || 0;
        calculate();
      }
    })
    return {
      get value() {
        return +input.value / 100;
      },
      elem: Elem('p', {className: 'min-score-input-wrapper-wrapper'}, [
        Elem('label', {className: 'min-score-label', for: id}, [label]),
        Elem('div', {className: 'min-score-input-wrapper'}, [
          input,
          Elem('span', {className: 'min-score-percent-sign'}, ['%'])
        ])
      ])
    }
  }
  const current = createInput('Current grade:', '95.00', 'min-score-current');
  const worth = createInput('Portion of grade the final is:', '15.00', 'min-score-worth');
  const minimum = createInput('Minimum acceptable grade:', '90.00', 'min-score-minimum');
  const output = Elem('p');
  calculate();
  return {
    wrapper: Elem('div', {}, [
      current.elem,
      worth.elem,
      minimum.elem,
      output
    ]),
    name: 'Min. Score',
    icon: './images/extensions/min-score.svg',
    styles: './js/extensions/min-score.css'
  };
})());
