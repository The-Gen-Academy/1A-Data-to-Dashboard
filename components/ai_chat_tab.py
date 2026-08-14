from __future__ import annotations

import streamlit as st

from utils.llm_agent import generate_chat_response


EXAMPLE_QUESTIONS = [
    "Summarize my historical trading performance.",
    "Why is my portfolio down today?",
    "Which stocks are driving most of my gains?",
    "Am I over-concentrated in any stock?",
    "What are my worst-performing holdings?",
]


def render_ai_chat_tab() -> None:
    st.header("AI Analyst Chat")
    transactions = st.session_state.get("transactions")
    holdings = st.session_state.get("holdings")
    metrics = st.session_state.get("performance_metrics")

    if transactions is None:
        st.info("Upload a valid CSV before starting an AI analyst chat.")
        return

    st.caption("Informational use only. This app does not provide financial advice.")
    with st.expander("Try asking", expanded=False):
        for question in EXAMPLE_QUESTIONS:
            st.write(question)

    for message in st.session_state.chat_messages:
        with st.chat_message(message["role"]):
            st.write(message["content"])

    prompt = st.chat_input("Ask about your portfolio")
    if not prompt:
        return

    st.session_state.chat_messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.write(prompt)

    response = generate_chat_response(
        user_question=prompt,
        transactions=transactions,
        holdings=holdings,
        performance_metrics=metrics,
        chat_history=st.session_state.chat_messages,
    )
    st.session_state.chat_messages.append({"role": "assistant", "content": response.text})

    with st.chat_message("assistant"):
        if response.ok:
            st.write(response.text)
        else:
            st.warning(response.text)
