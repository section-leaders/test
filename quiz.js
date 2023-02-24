/*
 * File: quiz.js
 * -------------
 * Evolving library for self-test quizzes.
 */

"use strict";

function answerClicked(e) {
    let t = e.target;
    let question = t.closest(".Question");
    let response = t.getAttribute("data-response");
    let isCorrect = response && response.startsWith("Correct");
    for (let r of question.getElementsByClassName("Response")) {
        let colorStyle = "UnselectedColor";
        if (r === t) {
            colorStyle = isCorrect ? "CorrectColor" : "IncorrectColor";
        }
        r.classList.remove("UnselectedColor","CorrectColor","IncorrectColor");
        r.classList.add(colorStyle);
        let areas = question.getElementsByClassName("NarrativeArea");
        if (response && areas) {
            let area = areas[0];
            for (let narrative of area.getElementsByClassName("Narrative")) {
                if (narrative.classList.contains(response)) {
                    narrative.style.display = "block";
                } else {
                    narrative.style.display = "none";
                }
            }
        }
    }
    
}

function initQuestions() {
    for (let e of document.getElementsByClassName("Response")) {
        e.addEventListener("click", answerClicked);
    }
}
