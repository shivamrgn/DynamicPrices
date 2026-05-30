"""
Q-Learning Reinforcement Learning Agent for Dynamic Pricing.

State Space:  (inventory_level, demand_score, competitor_ratio, sales_velocity)
Action Space: {0: Decrease, 1: Maintain, 2: Increase}
Reward:       Profit margin improvement + inventory optimization signal
"""

import numpy as np
import json
import os
from typing import Dict, Tuple, Optional
from loguru import logger
from app.core.config import settings


class PricingQLearningAgent:
    """
    Tabular Q-Learning agent for pricing decisions.
    Uses discretized state space for tractable learning.
    """

    def __init__(
        self,
        learning_rate: float = None,
        discount_factor: float = None,
        epsilon: float = None,
    ):
        self.lr = learning_rate or settings.RL_LEARNING_RATE
        self.gamma = discount_factor or settings.RL_DISCOUNT_FACTOR
        self.epsilon = epsilon or settings.RL_EPSILON
        self.epsilon_decay = settings.RL_EPSILON_DECAY
        self.epsilon_min = 0.01

        # Discretization bins
        self.inventory_bins = [0.1, 0.3, 0.6, 0.85]   # 5 levels
        self.demand_bins = [0.2, 0.4, 0.6, 0.8]         # 5 levels
        self.competitor_bins = [0.85, 0.95, 1.05, 1.15]  # 5 levels (our/theirs)
        self.velocity_bins = [2, 5, 10, 20]               # 5 levels

        # Q-table: state -> [decrease, maintain, increase]
        n_states = 5 ** 4  # 625 states
        self.q_table = np.zeros((n_states, 3))

        # Action mapping
        self.actions = {0: "decrease", 1: "maintain", 2: "increase"}
        self.price_adjustments = {0: -0.05, 1: 0.0, 2: 0.05}  # ±5%

        logger.info("Q-Learning agent initialized.")

    def _discretize_state(
        self,
        inventory_level: float,
        demand_score: float,
        competitor_ratio: float,
        sales_velocity: float,
    ) -> int:
        """Convert continuous state to discrete index."""
        inv_idx = np.digitize(inventory_level, self.inventory_bins)
        dem_idx = np.digitize(demand_score, self.demand_bins)
        comp_idx = np.digitize(competitor_ratio, self.competitor_bins)
        vel_idx = np.digitize(sales_velocity, self.velocity_bins)

        # Encode as single integer
        state_idx = (inv_idx * 125) + (dem_idx * 25) + (comp_idx * 5) + vel_idx
        return min(state_idx, self.q_table.shape[0] - 1)

    def get_action(
        self,
        inventory_level: float,
        demand_score: float,
        competitor_ratio: float,
        sales_velocity: float,
        explore: bool = False,
    ) -> Tuple[int, float, str]:
        """
        Select pricing action using epsilon-greedy policy.
        Returns: (action_idx, confidence, reasoning)
        """
        state_idx = self._discretize_state(
            inventory_level, demand_score, competitor_ratio, sales_velocity
        )

        if explore and np.random.random() < self.epsilon:
            action_idx = np.random.randint(0, 3)
            confidence = 0.5
        else:
            q_values = self.q_table[state_idx]
            action_idx = int(np.argmax(q_values))
            # Confidence from softmax of Q-values
            exp_q = np.exp(q_values - np.max(q_values))
            probs = exp_q / exp_q.sum()
            confidence = float(probs[action_idx])

        reasoning = self._generate_reasoning(
            action_idx, inventory_level, demand_score, competitor_ratio, sales_velocity
        )
        return action_idx, confidence, reasoning

    def update(
        self,
        state: Tuple[float, float, float, float],
        action_idx: int,
        reward: float,
        next_state: Tuple[float, float, float, float],
    ):
        """Bellman equation Q-table update."""
        state_idx = self._discretize_state(*state)
        next_state_idx = self._discretize_state(*next_state)

        current_q = self.q_table[state_idx, action_idx]
        max_next_q = np.max(self.q_table[next_state_idx])
        new_q = current_q + self.lr * (reward + self.gamma * max_next_q - current_q)
        self.q_table[state_idx, action_idx] = new_q

        # Decay epsilon
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay

    def compute_reward(
        self,
        old_price: float,
        new_price: float,
        cost_price: float,
        units_sold: float,
        inventory_before: float,
        inventory_after: float,
    ) -> float:
        """
        Reward = Profit signal + Inventory optimization signal.
        Penalizes both overstock (holding costs) and stockouts (lost sales).
        """
        # Profit component
        old_margin = (old_price - cost_price) / old_price if old_price > 0 else 0
        new_margin = (new_price - cost_price) / new_price if new_price > 0 else 0
        profit_reward = (new_margin - old_margin) * units_sold * 10

        # Inventory optimization: penalize extremes
        # Optimal inventory level ~50%
        inventory_penalty = -abs(inventory_after - 0.5) * 2

        # Revenue component
        revenue_delta = (new_price - old_price) * units_sold
        revenue_reward = np.sign(revenue_delta) * np.log1p(abs(revenue_delta)) * 0.1

        return float(profit_reward + inventory_penalty + revenue_reward)

    def simulate_training(self, n_episodes: int = 500):
        """
        Run simulated training episodes using synthetic market data.
        This bootstraps the agent before real data is available.
        """
        for episode in range(n_episodes):
            # Random starting state
            state = (
                np.random.random(),          # inventory
                np.random.random(),          # demand
                np.random.uniform(0.7, 1.3), # competitor ratio
                np.random.uniform(0, 25),    # velocity
            )

            for step in range(20):
                action_idx, _, _ = self.get_action(*state, explore=True)
                adj = self.price_adjustments[action_idx]

                # Simulate market response
                base_price = 100.0
                cost = 60.0
                new_price = base_price * (1 + adj)

                # Demand responds negatively to price increases
                demand_change = -adj * 2 * state[1]
                units_sold = max(0, 10 + demand_change * 10 + np.random.normal(0, 1))

                reward = self.compute_reward(
                    old_price=base_price,
                    new_price=new_price,
                    cost_price=cost,
                    units_sold=units_sold,
                    inventory_before=state[0],
                    inventory_after=max(0, state[0] - units_sold / 100),
                )

                next_state = (
                    max(0, state[0] - units_sold / 100),
                    min(1, state[1] + np.random.normal(0, 0.05)),
                    np.random.uniform(0.7, 1.3),
                    units_sold,
                )

                self.update(state, action_idx, reward, next_state)
                state = next_state

        logger.info(f"Q-Learning agent trained for {n_episodes} simulated episodes.")

    def _generate_reasoning(
        self,
        action_idx: int,
        inventory: float,
        demand: float,
        competitor_ratio: float,
        velocity: float,
    ) -> str:
        """Generate human-readable reasoning for pricing decision."""
        action = self.actions[action_idx]
        reasons = []

        if inventory > 0.8:
            reasons.append("high stock levels warrant clearance pricing")
        elif inventory < 0.2:
            reasons.append("low inventory supports price premium")

        if demand > 0.7:
            reasons.append("strong demand signal detected")
        elif demand < 0.3:
            reasons.append("weak demand requires price stimulus")

        if competitor_ratio > 1.1:
            reasons.append("we are priced above market — competitive pressure high")
        elif competitor_ratio < 0.9:
            reasons.append("pricing below market — margin capture opportunity exists")

        if velocity > 15:
            reasons.append("high sales velocity supports aggressive pricing")
        elif velocity < 3:
            reasons.append("slow-moving SKU benefits from price reduction")

        base = {
            "increase": "Price increase recommended",
            "decrease": "Price reduction recommended",
            "maintain": "Hold current pricing",
        }[action]

        if reasons:
            return f"{base}: {'; '.join(reasons[:2])}."
        return f"{base}: market conditions are stable."

    def get_price_recommendation(
        self,
        current_price: float,
        cost_price: float,
        inventory_level: float,
        demand_score: float,
        competitor_price: float,
        sales_velocity: float,
        min_price: float,
        max_price: float,
    ) -> Dict:
        """Full pricing recommendation with guardrails applied."""
        competitor_ratio = current_price / competitor_price if competitor_price > 0 else 1.0

        action_idx, confidence, reasoning = self.get_action(
            inventory_level, demand_score, competitor_ratio, sales_velocity
        )

        adjustment = self.price_adjustments[action_idx]
        raw_new_price = current_price * (1 + adjustment)

        # Apply guardrails
        min_margin_price = cost_price * (1 + settings.MIN_MARGIN_FLOOR)
        new_price = max(min_price, min(max_price, raw_new_price))
        new_price = max(new_price, min_margin_price)  # never below margin floor
        new_price = round(new_price, 2)

        # Recalculate actual change
        actual_change_pct = (new_price - current_price) / current_price * 100

        # Expected impact estimates
        price_elasticity = -1.5  # conservative assumption
        demand_change_pct = price_elasticity * (actual_change_pct / 100)
        new_margin = (new_price - cost_price) / new_price * 100
        old_margin = (current_price - cost_price) / current_price * 100
        margin_delta = new_margin - old_margin

        return {
            "action": self.actions[action_idx],
            "current_price": current_price,
            "recommended_price": new_price,
            "price_change_pct": round(actual_change_pct, 2),
            "expected_margin_pct": round(new_margin, 2),
            "expected_profit_impact": round(margin_delta, 2),
            "expected_revenue_impact": round(demand_change_pct * 100, 2),
            "confidence": round(confidence, 3),
            "reasoning": reasoning,
        }


# Module-level singleton (trained once on startup)
_agent: Optional[PricingQLearningAgent] = None


def get_rl_agent() -> PricingQLearningAgent:
    global _agent
    if _agent is None:
        _agent = PricingQLearningAgent()
        _agent.simulate_training(n_episodes=1000)
    return _agent
