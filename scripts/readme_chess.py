#!/usr/bin/env python3
import os
import re
import json
import sys
from pathlib import Path
from urllib.parse import quote

import chess
import chess.pgn

REPO_ROOT = Path(__file__).resolve().parents[1]
README_PATH = REPO_ROOT / "README.md"
GAMES_DIR = REPO_ROOT / "games"
CURRENT_PGN = GAMES_DIR / "current.pgn"

BEGIN_MARK = "<!-- BEGIN CHESS BOARD -->"
END_MARK = "<!-- END CHESS BOARD -->"

MOVE_TITLE_RE = re.compile(r"^Chess:\s*Move\s*([A-H][1-8])\s*to\s*([A-H][1-8])\s*$", re.IGNORECASE)
START_TITLE_RE = re.compile(r"^Chess:\s*Start\s*new\s*game\s*$", re.IGNORECASE)


def load_event():
    event_path = os.getenv("GITHUB_EVENT_PATH")
    if not event_path or not os.path.exists(event_path):
        return {}
    with open(event_path, "r", encoding="utf-8") as f:
        return json.load(f)


def ensure_dirs():
    GAMES_DIR.mkdir(parents=True, exist_ok=True)


def init_game():
    game = chess.pgn.Game()
    game.headers["Event"] = "README Chess"
    game.headers["Site"] = os.getenv("GITHUB_REPOSITORY", "")
    board = chess.Board()
    # Write initial empty game
    with open(CURRENT_PGN, "w", encoding="utf-8") as f:
        print(game, file=f)
    return game, board


def load_game():
    if not CURRENT_PGN.exists() or CURRENT_PGN.stat().st_size == 0:
        return init_game()
    with open(CURRENT_PGN, "r", encoding="utf-8") as f:
        game = chess.pgn.read_game(f)
    if game is None:
        return init_game()
    board = game.board()
    for move in game.mainline_moves():
        board.push(move)
    return game, board


def save_game(game):
    with open(CURRENT_PGN, "w", encoding="utf-8") as f:
        print(game, file=f)


UNICODE_PIECES = {
    chess.PAWN: {chess.WHITE: "♙", chess.BLACK: "♟"},
    chess.ROOK: {chess.WHITE: "♖", chess.BLACK: "♜"},
    chess.KNIGHT: {chess.WHITE: "♘", chess.BLACK: "♞"},
    chess.BISHOP: {chess.WHITE: "♗", chess.BLACK: "♝"},
    chess.QUEEN: {chess.WHITE: "♕", chess.BLACK: "♛"},
    chess.KING: {chess.WHITE: "♔", chess.BLACK: "♚"},
}


def board_table(board: chess.Board) -> str:
    header = "| A | B | C | D | E | F | G | H |\n|---|---|---|---|---|---|---|---|\n"
    rows = []
    for rank in range(8, 0, -1):
        cells = []
        for file_idx in range(1, 9):
            square = chess.square(file_idx - 1, rank - 1)
            piece = board.piece_at(square)
            if piece:
                cells.append(UNICODE_PIECES[piece.piece_type][piece.color])
            else:
                cells.append("·")
        rows.append(f"| " + " | ".join(cells) + " | ")
    # Add rank/file labels around
    labeled_rows = []
    files_label = "| **A** | **B** | **C** | **D** | **E** | **F** | **G** | **H** |"
    for i, row in enumerate(rows):
        rank_label = 8 - i
        labeled_rows.append(f"| **{rank_label}** |" + row[1:-2] + f"| **{rank_label}** |")
    header_with_borders = "|     | A | B | C | D | E | F | G | H |     |\n|-----|---|---|---|---|---|---|---|---|-----|\n"
    files_with_borders = "|     | **A** | **B** | **C** | **D** | **E** | **F** | **G** | **H** |     |"
    top = header_with_borders
    body = "\n".join(labeled_rows)
    table = top + body + "\n" + files_with_borders
    return table


def legal_moves_links(board: chess.Board, repo: str, limit: int = 60) -> str:
    by_from = {}
    for mv in board.legal_moves:
        from_sq = chess.square_name(mv.from_square).upper()
        to_sq = chess.square_name(mv.to_square).upper()
        by_from.setdefault(from_sq, []).append(to_sq)
    lines = ["", "**It's your turn to move! Choose one from the following table**", "", "| FROM | TO (Click to create an issue) |", "|------|-------------------------------|"]
    count = 0
    for from_sq, tos in sorted(by_from.items()):
        links = []
        for to_sq in sorted(tos):
            if count >= limit:
                break
            title = f"Chess: Move {from_sq} to {to_sq}"
            url = f"https://github.com/{repo}/issues/new?title={quote(title)}&body={quote('Please do not change the title. Just click "Submit new issue".') }"
            links.append(f"[{to_sq}]({url})")
            count += 1
        if links:
            lines.append(f"| **{from_sq}** | " + ", ".join(links) + " |")
        if count >= limit:
            break
    return "\n".join(lines)


def render_section(board: chess.Board, repo: str) -> str:
    turn_text = "white" if board.turn == chess.WHITE else "black"
    header = f"This is an open chess game in the README. It's your turn to play! Move a {turn_text} piece.\n"
    table = board_table(board)
    moves = legal_moves_links(board, repo)
    return "\n".join([header, "", table, "", moves])


def update_readme(content: str):
    if not README_PATH.exists():
        print("README.md not found", file=sys.stderr)
        return
    text = README_PATH.read_text(encoding="utf-8")
    if BEGIN_MARK in text and END_MARK in text:
        before = text.split(BEGIN_MARK)[0]
        after = text.split(END_MARK)[1]
        new_text = before + BEGIN_MARK + "\n" + content + "\n" + END_MARK + after
    else:
        # Append at end
        new_text = text.rstrip() + "\n\n### ♟️ Main Catur di README\n\n" + BEGIN_MARK + "\n" + content + "\n" + END_MARK + "\n"
    README_PATH.write_text(new_text, encoding="utf-8")


def main():
    ensure_dirs()
    repo = os.getenv("GITHUB_REPOSITORY", "")
    event = load_event()
    title = (event.get("issue", {}).get("title", "") or "").strip()

    game, board = load_game()

    # Handle commands
    performed_move = False
    if START_TITLE_RE.match(title):
        game, board = init_game()
    else:
        m = MOVE_TITLE_RE.match(title)
        if m:
            from_sq, to_sq = m.group(1).lower(), m.group(2).lower()
            uci = from_sq + to_sq
            move = chess.Move.from_uci(uci)
            if move in board.legal_moves:
                # Append move to PGN
                # Re-read game to get nodes
                with open(CURRENT_PGN, "r", encoding="utf-8") as f:
                    game = chess.pgn.read_game(f) or chess.pgn.Game()
                node = game.end()
                node = node.add_variation(move)
                save_game(game)
                board.push(move)
                performed_move = True

    # Render section
    section = render_section(board, repo)
    update_readme(section)

    # Also store current position as FEN in a text file for reference
    (REPO_ROOT / "games" / "current.fen").write_text(board.fen(), encoding="utf-8")

    print("Done. Move performed:" , performed_move)


if __name__ == "__main__":
    main()