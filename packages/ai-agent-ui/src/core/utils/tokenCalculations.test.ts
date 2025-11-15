import { describe, it, expect } from 'vitest';
import {
  calculateTokenWarningLevel,
  calculateTokenPercentage,
  calculateTokenUsageDetails,
} from './tokenCalculations';
import type { TokenUsage, TokenLimits } from '../types';

describe('tokenCalculations', () => {
  describe('calculateTokenPercentage', () => {
    it('正しくパーセンテージを計算する', () => {
      expect(calculateTokenPercentage(750, 1000)).toBe(75);
      expect(calculateTokenPercentage(500, 1000)).toBe(50);
      expect(calculateTokenPercentage(250, 1000)).toBe(25);
    });

    it('100%を超える場合は100に制限される', () => {
      expect(calculateTokenPercentage(1200, 1000)).toBe(100);
      expect(calculateTokenPercentage(2000, 1000)).toBe(100);
    });

    it('最大値が未設定の場合は0を返す', () => {
      expect(calculateTokenPercentage(500, undefined)).toBe(0);
      expect(calculateTokenPercentage(1000, undefined)).toBe(0);
    });

    it('最大値が0以下の場合は0を返す', () => {
      expect(calculateTokenPercentage(500, 0)).toBe(0);
      expect(calculateTokenPercentage(500, -100)).toBe(0);
    });

    it('使用量が0の場合は0%を返す', () => {
      expect(calculateTokenPercentage(0, 1000)).toBe(0);
    });
  });

  describe('calculateTokenWarningLevel', () => {
    it('制限が設定されていない場合は常にnormalを返す', () => {
      const usage: TokenUsage = {
        input: 1000,
        output: 500,
        total: 1500,
      };
      const limits: TokenLimits = {};

      expect(calculateTokenWarningLevel(usage, limits)).toBe('normal');
    });

    it('Token使用率が100%以上の場合はdangerを返す', () => {
      const usage: TokenUsage = {
        input: 800,
        output: 200,
        total: 1000,
      };
      const limits: TokenLimits = {
        maxTokens: 1000,
      };

      expect(calculateTokenWarningLevel(usage, limits)).toBe('danger');
    });

    it('Token使用率が警告閾値以上の場合はwarningを返す', () => {
      const usage: TokenUsage = {
        input: 700,
        output: 150,
        total: 850,
      };
      const limits: TokenLimits = {
        maxTokens: 1000,
        warningThreshold: 0.8, // 80%
      };

      expect(calculateTokenWarningLevel(usage, limits)).toBe('warning');
    });

    it('Token使用率が警告閾値未満の場合はnormalを返す', () => {
      const usage: TokenUsage = {
        input: 500,
        output: 100,
        total: 600,
      };
      const limits: TokenLimits = {
        maxTokens: 1000,
        warningThreshold: 0.8,
      };

      expect(calculateTokenWarningLevel(usage, limits)).toBe('normal');
    });

    it('カスタム警告閾値が適用される', () => {
      const usage: TokenUsage = {
        input: 600,
        output: 100,
        total: 700,
      };
      const limits: TokenLimits = {
        maxTokens: 1000,
        warningThreshold: 0.7, // 70%
      };

      expect(calculateTokenWarningLevel(usage, limits)).toBe('warning');
    });

    it('警告閾値が未設定の場合はデフォルト80%が使われる', () => {
      const usage: TokenUsage = {
        input: 750,
        output: 100,
        total: 850,
      };
      const limits: TokenLimits = {
        maxTokens: 1000,
        // warningThreshold未設定 → デフォルト0.8
      };

      expect(calculateTokenWarningLevel(usage, limits)).toBe('warning');
    });

    describe('コストベースの警告判定', () => {
      it('コストが制限値に達した場合はdangerを返す', () => {
        const usage: TokenUsage = {
          input: 500,
          output: 200,
          total: 700,
          cost: 0.02,
        };
        const limits: TokenLimits = {
          maxCost: 0.02,
        };

        expect(calculateTokenWarningLevel(usage, limits)).toBe('danger');
      });

      it('コストが警告閾値以上の場合はwarningを返す', () => {
        const usage: TokenUsage = {
          input: 500,
          output: 200,
          total: 700,
          cost: 0.016,
        };
        const limits: TokenLimits = {
          maxCost: 0.02,
          warningThreshold: 0.8,
        };

        expect(calculateTokenWarningLevel(usage, limits)).toBe('warning');
      });

      it('costが未定義の場合はコストチェックをスキップする', () => {
        const usage: TokenUsage = {
          input: 500,
          output: 200,
          total: 700,
          // cost未定義
        };
        const limits: TokenLimits = {
          maxCost: 0.01,
        };

        expect(calculateTokenWarningLevel(usage, limits)).toBe('normal');
      });
    });

    describe('Token数とコストの複合判定', () => {
      it('Token数が安全でもコストがdangerの場合はdangerを返す', () => {
        const usage: TokenUsage = {
          input: 300,
          output: 100,
          total: 400, // 40% - 安全
          cost: 0.02, // 100% - 危険
        };
        const limits: TokenLimits = {
          maxTokens: 1000,
          maxCost: 0.02,
          warningThreshold: 0.8,
        };

        expect(calculateTokenWarningLevel(usage, limits)).toBe('danger');
      });

      it('コストが安全でもToken数がdangerの場合はdangerを返す', () => {
        const usage: TokenUsage = {
          input: 800,
          output: 200,
          total: 1000, // 100% - 危険
          cost: 0.005, // 25% - 安全
        };
        const limits: TokenLimits = {
          maxTokens: 1000,
          maxCost: 0.02,
          warningThreshold: 0.8,
        };

        expect(calculateTokenWarningLevel(usage, limits)).toBe('danger');
      });

      it('いずれかが警告閾値以上の場合はwarningを返す', () => {
        const usage: TokenUsage = {
          input: 400,
          output: 100,
          total: 500, // 50% - 安全
          cost: 0.016, // 80% - 警告
        };
        const limits: TokenLimits = {
          maxTokens: 1000,
          maxCost: 0.02,
          warningThreshold: 0.8,
        };

        expect(calculateTokenWarningLevel(usage, limits)).toBe('warning');
      });
    });
  });

  describe('calculateTokenUsageDetails', () => {
    it('正しく詳細情報を計算する（normal状態）', () => {
      const usage: TokenUsage = {
        input: 400,
        output: 100,
        total: 500,
        cost: 0.005,
      };
      const limits: TokenLimits = {
        maxTokens: 1000,
        maxCost: 0.02,
        warningThreshold: 0.8,
      };

      const details = calculateTokenUsageDetails(usage, limits);

      expect(details.usage).toEqual(usage);
      expect(details.limits).toEqual(limits);
      expect(details.warningLevel).toBe('normal');
      expect(details.tokenPercentage).toBe(50);
      expect(details.costPercentage).toBe(25);
      expect(details.isLimitReached).toBe(false);
      expect(details.isWarningReached).toBe(false);
    });

    it('正しく詳細情報を計算する（warning状態）', () => {
      const usage: TokenUsage = {
        input: 700,
        output: 150,
        total: 850,
        cost: 0.016,
      };
      const limits: TokenLimits = {
        maxTokens: 1000,
        maxCost: 0.02,
        warningThreshold: 0.8,
      };

      const details = calculateTokenUsageDetails(usage, limits);

      expect(details.warningLevel).toBe('warning');
      expect(details.tokenPercentage).toBe(85);
      expect(details.costPercentage).toBe(80);
      expect(details.isLimitReached).toBe(false);
      expect(details.isWarningReached).toBe(true);
    });

    it('正しく詳細情報を計算する（danger状態）', () => {
      const usage: TokenUsage = {
        input: 800,
        output: 200,
        total: 1000,
        cost: 0.02,
      };
      const limits: TokenLimits = {
        maxTokens: 1000,
        maxCost: 0.02,
        warningThreshold: 0.8,
      };

      const details = calculateTokenUsageDetails(usage, limits);

      expect(details.warningLevel).toBe('danger');
      expect(details.tokenPercentage).toBe(100);
      expect(details.costPercentage).toBe(100);
      expect(details.isLimitReached).toBe(true);
      expect(details.isWarningReached).toBe(true);
    });

    it('制限が未設定の場合も正しく動作する', () => {
      const usage: TokenUsage = {
        input: 5000,
        output: 1000,
        total: 6000,
        cost: 0.5,
      };
      const limits: TokenLimits = {};

      const details = calculateTokenUsageDetails(usage, limits);

      expect(details.warningLevel).toBe('normal');
      expect(details.tokenPercentage).toBe(0);
      expect(details.costPercentage).toBe(0);
      expect(details.isLimitReached).toBe(false);
      expect(details.isWarningReached).toBe(false);
    });

    it('costが未定義でも正しく動作する', () => {
      const usage: TokenUsage = {
        input: 700,
        output: 150,
        total: 850,
        // cost未定義
      };
      const limits: TokenLimits = {
        maxTokens: 1000,
        maxCost: 0.02,
        warningThreshold: 0.8,
      };

      const details = calculateTokenUsageDetails(usage, limits);

      expect(details.warningLevel).toBe('warning');
      expect(details.tokenPercentage).toBe(85);
      expect(details.costPercentage).toBe(0); // costが未定義なので0
      expect(details.isWarningReached).toBe(true);
    });

    it('制限値超過時に100%にキャップされる', () => {
      const usage: TokenUsage = {
        input: 1500,
        output: 500,
        total: 2000,
        cost: 0.05,
      };
      const limits: TokenLimits = {
        maxTokens: 1000,
        maxCost: 0.02,
      };

      const details = calculateTokenUsageDetails(usage, limits);

      expect(details.tokenPercentage).toBe(100); // 200%だが100にキャップ
      expect(details.costPercentage).toBe(100); // 250%だが100にキャップ
    });
  });
});
