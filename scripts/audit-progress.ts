#!/usr/bin/env tsx

/**
 * Script de suivi des progrès de correction de la dette technique
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface AuditMetrics {
  typescriptErrors: number;
  eslintErrors: number;
  eslintWarnings: number;
  buildSuccess: boolean;
  coverage: number;
  timestamp: string;
}

interface ProgressReport {
  current: AuditMetrics;
  baseline: AuditMetrics;
  improvement: {
    typescriptErrors: number;
    eslintErrors: number;
    eslintWarnings: number;
    overallScore: number;
  };
  phase: string;
  recommendations: string[];
}

class AuditProgressTracker {
  private baseline: AuditMetrics | null = null;
  private readonly metricsFile = join(process.cwd(), 'audit-metrics.json');

  async run() {
    console.log('📊 Audit des progrès de correction de la dette technique...\n');

    try {
      // Charger les métriques de base
      await this.loadBaseline();

      // Mesurer les métriques actuelles
      const currentMetrics = await this.measureCurrentMetrics();

      // Générer le rapport
      const report = this.generateReport(currentMetrics);

      // Afficher le rapport
      this.displayReport(report);

      // Sauvegarder les métriques actuelles
      await this.saveMetrics(currentMetrics);

    } catch (error) {
      console.error('❌ Erreur lors de l\'audit:', error);
      process.exit(1);
    }
  }

  private async loadBaseline(): Promise<void> {
    if (existsSync(this.metricsFile)) {
      try {
        const data = JSON.parse(readFileSync(this.metricsFile, 'utf8'));
        this.baseline = data.baseline || this.getDefaultBaseline();
      } catch (error) {
        console.warn('⚠️  Impossible de charger les métriques de base, utilisation des valeurs par défaut');
        this.baseline = this.getDefaultBaseline();
      }
    } else {
      console.log('📝 Première exécution - création des métriques de base');
      this.baseline = this.getDefaultBaseline();
    }
  }

  private getDefaultBaseline(): AuditMetrics {
    return {
      typescriptErrors: 475,
      eslintErrors: 100,
      eslintWarnings: 50,
      buildSuccess: false,
      coverage: 60,
      timestamp: new Date().toISOString()
    };
  }

  private async measureCurrentMetrics(): Promise<AuditMetrics> {
    console.log('🔍 Mesure des métriques actuelles...');

    const metrics: AuditMetrics = {
      typescriptErrors: 0,
      eslintErrors: 0,
      eslintWarnings: 0,
      buildSuccess: false,
      coverage: 0,
      timestamp: new Date().toISOString()
    };

    // Mesurer les erreurs TypeScript
    try {
      const tscOutput = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8' });
      const errorMatches = tscOutput.match(/error TS\d+:/g);
      metrics.typescriptErrors = errorMatches ? errorMatches.length : 0;
    } catch (error) {
      const errorOutput = error.stdout?.toString() || '';
      const errorMatches = errorOutput.match(/error TS\d+:/g);
      metrics.typescriptErrors = errorMatches ? errorMatches.length : 0;
    }

    // Mesurer les erreurs ESLint
    try {
      const eslintOutput = execSync('npm run lint 2>&1', { encoding: 'utf8' });
      const errorMatches = eslintOutput.match(/\d+:\d+\s+Error:/g);
      const warningMatches = eslintOutput.match(/\d+:\d+\s+Warning:/g);
      metrics.eslintErrors = errorMatches ? errorMatches.length : 0;
      metrics.eslintWarnings = warningMatches ? warningMatches.length : 0;
    } catch (error) {
      const errorOutput = error.stdout?.toString() || '';
      const errorMatches = errorOutput.match(/\d+:\d+\s+Error:/g);
      const warningMatches = errorOutput.match(/\d+:\d+\s+Warning:/g);
      metrics.eslintErrors = errorMatches ? errorMatches.length : 0;
      metrics.eslintWarnings = warningMatches ? warningMatches.length : 0;
    }

    // Vérifier le build
    try {
      execSync('npm run build', { stdio: 'pipe' });
      metrics.buildSuccess = true;
    } catch (error) {
      metrics.buildSuccess = false;
    }

    // Mesurer la couverture (approximative basée sur les erreurs)
    const totalIssues = metrics.typescriptErrors + metrics.eslintErrors;
    const maxIssues = this.baseline!.typescriptErrors + this.baseline!.eslintErrors;
    metrics.coverage = Math.max(0, Math.min(100, ((maxIssues - totalIssues) / maxIssues) * 100));

    return metrics;
  }

  private generateReport(currentMetrics: AuditMetrics): ProgressReport {
    if (!this.baseline) {
      throw new Error('Baseline non chargée');
    }

    const improvement = {
      typescriptErrors: this.baseline.typescriptErrors - currentMetrics.typescriptErrors,
      eslintErrors: this.baseline.eslintErrors - currentMetrics.eslintErrors,
      eslintWarnings: this.baseline.eslintWarnings - currentMetrics.eslintWarnings,
      overallScore: this.calculateOverallScore(currentMetrics)
    };

    const phase = this.determinePhase(currentMetrics);
    const recommendations = this.generateRecommendations(currentMetrics, improvement);

    return {
      current: currentMetrics,
      baseline: this.baseline,
      improvement,
      phase,
      recommendations
    };
  }

  private calculateOverallScore(metrics: AuditMetrics): number {
    const maxScore = 100;
    const typescriptPenalty = (metrics.typescriptErrors / this.baseline!.typescriptErrors) * 40;
    const eslintPenalty = (metrics.eslintErrors / this.baseline!.eslintErrors) * 30;
    const buildPenalty = metrics.buildSuccess ? 0 : 20;
    const coverageBonus = (metrics.coverage / 100) * 10;

    return Math.max(0, Math.min(100, maxScore - typescriptPenalty - eslintPenalty - buildPenalty + coverageBonus));
  }

  private determinePhase(metrics: AuditMetrics): string {
    const totalErrors = metrics.typescriptErrors + metrics.eslintErrors;
    const totalBaseline = this.baseline!.typescriptErrors + this.baseline!.eslintErrors;
    const progress = ((totalBaseline - totalErrors) / totalBaseline) * 100;

    if (progress < 25) return 'Phase 1 - Critique';
    if (progress < 50) return 'Phase 2 - Important';
    if (progress < 75) return 'Phase 3 - Maintenance';
    if (progress < 95) return 'Phase 4 - Finalisation';
    return 'Phase 5 - Optimisation';
  }

  private generateRecommendations(metrics: AuditMetrics, improvement: any): string[] {
    const recommendations: string[] = [];

    if (metrics.typescriptErrors > 100) {
      recommendations.push('🚨 Priorité CRITIQUE : Corriger les erreurs TypeScript (>100 restantes)');
    } else if (metrics.typescriptErrors > 50) {
      recommendations.push('⚠️ Priorité HAUTE : Corriger les erreurs TypeScript restantes');
    } else if (metrics.typescriptErrors > 0) {
      recommendations.push('📝 Priorité MOYENNE : Finaliser la correction TypeScript');
    }

    if (metrics.eslintErrors > 50) {
      recommendations.push('🔧 Corriger les erreurs ESLint (>50 restantes)');
    } else if (metrics.eslintErrors > 0) {
      recommendations.push('🔧 Finaliser la correction ESLint');
    }

    if (!metrics.buildSuccess) {
      recommendations.push('🏗️ Corriger les erreurs de build');
    }

    if (metrics.coverage < 80) {
      recommendations.push('📊 Améliorer la couverture de code (<80%)');
    }

    if (improvement.overallScore < 50) {
      recommendations.push('📈 Focus sur les problèmes critiques pour améliorer le score global');
    }

    if (recommendations.length === 0) {
      recommendations.push('🎉 Excellent travail ! La dette technique est bien maîtrisée');
    }

    return recommendations;
  }

  private displayReport(report: ProgressReport): void {
    console.log('\n📊 RAPPORT DE PROGRÈS - DETTE TECHNIQUE\n');
    console.log('=' .repeat(60));

    // Métriques actuelles
    console.log('\n📈 MÉTRIQUES ACTUELLES :');
    console.log(`  • Erreurs TypeScript : ${report.current.typescriptErrors}`);
    console.log(`  • Erreurs ESLint : ${report.current.eslintErrors}`);
    console.log(`  • Avertissements ESLint : ${report.current.eslintWarnings}`);
    console.log(`  • Build réussi : ${report.current.buildSuccess ? '✅' : '❌'}`);
    console.log(`  • Couverture : ${report.current.coverage.toFixed(1)}%`);

    // Améliorations
    console.log('\n📈 AMÉLIORATIONS DEPUIS LA BASE :');
    console.log(`  • Erreurs TypeScript : -${report.improvement.typescriptErrors} (${((report.improvement.typescriptErrors / report.baseline.typescriptErrors) * 100).toFixed(1)}%)`);
    console.log(`  • Erreurs ESLint : -${report.improvement.eslintErrors} (${((report.improvement.eslintErrors / report.baseline.eslintErrors) * 100).toFixed(1)}%)`);
    console.log(`  • Score global : ${report.improvement.overallScore.toFixed(1)}/100`);

    // Phase actuelle
    console.log('\n🎯 PHASE ACTUELLE :');
    console.log(`  • ${report.phase}`);

    // Recommandations
    console.log('\n💡 RECOMMANDATIONS :');
    report.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });

    // Progrès global
    const totalBaseline = report.baseline.typescriptErrors + report.baseline.eslintErrors;
    const totalCurrent = report.current.typescriptErrors + report.current.eslintErrors;
    const globalProgress = ((totalBaseline - totalCurrent) / totalBaseline) * 100;

    console.log('\n🎯 PROGRÈS GLOBAL :');
    console.log(`  • ${globalProgress.toFixed(1)}% des problèmes corrigés`);
    console.log(`  • ${totalCurrent} problèmes restants sur ${totalBaseline}`);

    // Barre de progression
    const progressBar = this.createProgressBar(globalProgress);
    console.log(`  • ${progressBar} ${globalProgress.toFixed(1)}%`);

    console.log('\n' + '='.repeat(60));
  }

  private createProgressBar(percentage: number): string {
    const width = 20;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  private async saveMetrics(metrics: AuditMetrics): Promise<void> {
    const data = {
      baseline: this.baseline,
      current: metrics,
      lastUpdated: new Date().toISOString()
    };

    const fs = await import('fs/promises');
    await fs.writeFile(this.metricsFile, JSON.stringify(data, null, 2));
  }
}

// Exécution du script
if (require.main === module) {
  const tracker = new AuditProgressTracker();
  tracker.run().catch(console.error);
}

export default AuditProgressTracker;
