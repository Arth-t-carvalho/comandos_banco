SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

CREATE SCHEMA IF NOT EXISTS epi_guard DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE epi_guard;

-- -----------------------------------------------------
-- 1. SETORES
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS setores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  sigla VARCHAR(10),
  status ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
  epis_json TEXT COMMENT 'Slugs dos EPIs em formato JSON',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 2. FUNCIONARIOS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS funcionarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  setor_id INT,
  turno ENUM('MANHA','TARDE','NOITE','INTEGRAL'),
  foto_referencia VARCHAR(255) COMMENT 'Caminho da foto para reconhecimento facial',
  status ENUM('ATIVO','INATIVO','AFASTADO') NOT NULL DEFAULT 'ATIVO',
  status_epi ENUM('CONFORME','NAO_CONFORME') NOT NULL DEFAULT 'CONFORME',
  ultima_atualizacao_status DATETIME DEFAULT CURRENT_TIMESTAMP,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_funcionario_setor (setor_id),
  CONSTRAINT fk_funcionario_setor 
    FOREIGN KEY (setor_id) 
    REFERENCES setores(id) 
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 3. TIPOS DE EPI
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS epis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  descricao TEXT,
  status ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO'
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 4. OCORRENCIAS DE SEGURANÇA
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS ocorrencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  funcionario_id INT NOT NULL,
  data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipo ENUM('INFRACAO','CONFORMIDADE') NOT NULL,
  oculto BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ocorrencia_funcionario (funcionario_id),
  INDEX idx_ocorrencia_data (data_hora),
  CONSTRAINT fk_ocorrencia_funcionario
    FOREIGN KEY (funcionario_id)
    REFERENCES funcionarios(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 5. RELAÇÃO OCORRÊNCIA - EPIs
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS ocorrencia_epis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ocorrencia_id INT NOT NULL,
  epi_id INT NOT NULL,
  INDEX idx_ocorrencia (ocorrencia_id),
  INDEX idx_epi (epi_id),
  CONSTRAINT fk_ocorrencia_epi_ocorrencia
    FOREIGN KEY (ocorrencia_id)
    REFERENCES ocorrencias(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_ocorrencia_epi_epi
    FOREIGN KEY (epi_id)
    REFERENCES epis(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 6. USUARIOS DO SISTEMA
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) NOT NULL,
  senha VARCHAR(255) NOT NULL COMMENT 'Hash Bcrypt ou Argon2',
  cargo ENUM('SUPER_ADMIN','SUPERVISOR','GERENTE_SEGURANCA') NOT NULL,
  setor_id INT,
  turno ENUM('MANHA','TARDE','NOITE','INTEGRAL'),
  status ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_usuario (usuario),
  INDEX idx_usuario_setor (setor_id),
  CONSTRAINT fk_usuario_setor
    FOREIGN KEY (setor_id)
    REFERENCES setores(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 7. AÇÕES DISCIPLINARES
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS acoes_ocorrencia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ocorrencia_id INT NOT NULL,
  usuario_id INT NOT NULL,
  tipo ENUM('OBSERVACAO','ADVERTENCIA_VERBAL','ADVERTENCIA_ESCRITA','SUSPENSAO') NOT NULL,
  observacao TEXT,
  data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_acao_ocorrencia (ocorrencia_id),
  INDEX idx_acao_usuario (usuario_id),
  CONSTRAINT fk_acao_ocorrencia
    FOREIGN KEY (ocorrencia_id)
    REFERENCES ocorrencias(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_acao_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 8. AMOSTRAS FACIAIS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS amostras_faciais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  funcionario_id INT NOT NULL,
  caminho_imagem VARCHAR(255) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_amostra_funcionario (funcionario_id),
  CONSTRAINT fk_amostra_funcionario
    FOREIGN KEY (funcionario_id)
    REFERENCES funcionarios(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 9. EVIDENCIAS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS evidencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ocorrencia_id INT NOT NULL,
  caminho_imagem VARCHAR(255) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_evidencia_ocorrencia (ocorrencia_id),
  CONSTRAINT fk_evidencia_ocorrencia
    FOREIGN KEY (ocorrencia_id)
    REFERENCES ocorrencias(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
