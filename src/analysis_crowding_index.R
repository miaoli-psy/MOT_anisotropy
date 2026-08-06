library(lme4)
library(emmeans)
library(tidyverse)
library(patchwork)

setwd("d:/OneDrive/projects/MOT_anisotropy_code/data_clean/")

my_plot_theme <- theme(
  axis.title.x = element_text(color = "black", size = 14, face = "bold", margin = margin(t = 10)),
  axis.title.y = element_text(color = "black", size = 14, face = "bold", margin = margin(r = 10)),
  axis.text.x  = element_text(size = 12, face = "bold", color = "black"),
  axis.text.y  = element_text(size = 12, face = "bold", color = "black"),
  axis.line    = element_line(colour = "black", linewidth = 0.8),
  panel.border     = element_blank(),
  panel.grid.major = element_blank(),
  panel.grid.minor = element_blank(),
  panel.background = element_blank(),
  strip.text       = element_text(size = 12, face = "bold"),
  legend.title     = element_text(size = 12, face = "bold"),
  legend.text      = element_text(size = 10),
  plot.title       = element_text(size = 16, face = "bold"),
  plot.subtitle    = element_text(size = 12, color = "grey30"),
  panel.spacing    = unit(1.5, "lines")
)

zone_cols <- c("weak" = "#1a80bb", "strong" = "#f1a226")


# data
crowd <- read.csv("crowding_index.csv")

crowd$participant <- factor(crowd$participant)
crowd$cond <- factor(crowd$cond, levels = c("strong", "weak"))

crowd <- crowd %>%
  mutate(
    crowd_count.z = as.numeric(scale(crowd_count))
  )

m_count <- glmer(cbind(n_hits, n_errors) ~ crowd_count.z + (1 | participant),
                  data = crowd, family = binomial)


summary(m_count)

sjPlot::tab_model(
  m_count,
  p.style = 'scientific_stars',
  show.se = T,
  show.stat = T,
  digits = 3
) 



# --------------------plots-----------------------
# Everything is plotted on the ERROR scale (errors per trial, 0-5).
# The model is fitted to hits out of 5, so expected errors = 5 * (1 - p).
# The transform is monotonic decreasing -> CI bounds swap.

to_err <- function(p) 5 * (1 - p)

# population-level prediction grid (this was missing before: p_crowd used `newd`)
cc_mean <- mean(crowd$crowd_count)
cc_sd   <- sd(crowd$crowd_count)

newd <- data.frame(crowd_count = seq(min(crowd$crowd_count),
                                     max(crowd$crowd_count),
                                     length.out = 200)) %>%
  mutate(crowd_count.z = (crowd_count - cc_mean) / cc_sd)

# population-level (random effects excluded) fit + Wald CI on the link scale
Xnew <- model.matrix(~ crowd_count.z, data = newd)
eta  <- as.vector(Xnew %*% fixef(m_count))
se   <- sqrt(diag(Xnew %*% as.matrix(vcov(m_count)) %*% t(Xnew)))

newd <- newd %>%
  mutate(
    fit = to_err(plogis(eta)),
    lo  = to_err(plogis(eta + 1.96 * se)),   # bounds swap
    hi  = to_err(plogis(eta - 1.96 * se))
  )

# binned observed means (participant-level), on the error scale

crowd <- crowd %>%
  mutate(
    bin = case_when(
      crowd_count == 0  ~ "0",
      crowd_count <= 8  ~ "3-8",
      crowd_count <= 13 ~ "9-13",
      crowd_count <= 18 ~ "14-18",
      TRUE              ~ "19-27"
    )
  )

bin_means <- crowd %>%
  group_by(participant, bin) %>%
  summarise(err = mean(n_errors), .groups = "drop") %>%
  group_by(bin) %>%
  summarise(
    avg = mean(err),
    sd  = sd(err),
    n   = n()
  ) %>%
  mutate(
    sem = sd / sqrt(n),
    ci  = sem * qt((1 - 0.05) / 2 + .5, n - 1),
    ci_lower = avg - ci,
    ci_upper = avg + ci
  )

# place each bin at the mean encounter count of its trials
bin_pos <- crowd %>%
  group_by(bin) %>%
  summarise(x = mean(crowd_count))

bin_means <- bin_means %>%
  left_join(bin_pos, by = "bin")


p_crowd <- ggplot() +
  
  # geom_point(
  #   data = crowd,
  #   aes(x = crowd_count, y = n_errors, color = cond),
  #   position = position_jitter(width = 0.35, height = 0.13, seed = 1),
  #   alpha = 0.07,
  #   size = 1.2
  # ) +

  geom_ribbon(
    data = newd,
    aes(x = crowd_count, ymin = lo, ymax = hi),
    fill = "grey60",
    alpha = 0.35
  ) +

  geom_line(
    data = newd,
    aes(x = crowd_count, y = fit),
    color = "black",
    linewidth = 1.3
  ) +

  geom_errorbar(
    data = bin_means,
    aes(x = x, ymin = ci_lower, ymax = ci_upper),
    width = 0.8,
    linewidth = 0.8,
    color = "black"
  ) +
  
  geom_point(
    data = bin_means,
    aes(x = x, y = avg),
    size = 3,
    color = "black"
  ) +
  
  geom_text(
    data = bin_means,
    aes(x = x, y = ci_upper + 0.18, label = bin),
    size = 4.5,
    fontface = "bold",
    color = "grey30"
  ) +

  # scale_color_manual(values = zone_cols) +

  scale_y_continuous(breaks = 0:4) +

  scale_x_continuous(breaks = c(0, 10, 20, 27)) +

  # full observed range of the DV: no trials are hidden
  coord_cartesian(ylim = c(-0.2, 2.1)) +
  # scale_y_continuous(breaks = 0:3, limits = c(-0.2, 3.2)) +

  labs(x = "Crowding encounters per trial",
       y = "Errors per trial") +
  
  my_plot_theme +
  
  # theme(legend.background    = element_rect(fill = "white", color = NA),
  #       legend.title         = element_text(size = 14, face = "bold"),
  #       legend.text          = element_text(size = 13),
  #       legend.key.size      = unit(1.2, "lines")) +
  # 
  # theme(legend.position = "none") +
  
  guides(color = guide_legend(override.aes = list(size = 3, alpha = 1)))

p_crowd

# ggsave("crowding_binned_plot.svg", p_crowd, width = 5, height = 3.6, units = "in")


# need to run analysis_errors.R as well
main_plot2 <- (p_errors | p_model |p_crowd) +
  plot_layout(widths = c(1, 1, 1)) +
  plot_annotation(tag_levels = "A") &
  theme(plot.tag = element_text(size = 16, face = "bold"))

main_plot2


ggsave(
  filename = "error_plot.svg",
  plot = main_plot2,
  width = 12,
  height = 4,
  units = "in"
)


# per participant:
# ---- per-participant curves from the random-intercept model --------------
# shared population slope + participant-specific intercept (parallel curves)

crowd$pid <- as.numeric(crowd$participant)

# one prediction grid per participant, restricted to each participant's
# observed encounter range (no extrapolation beyond their data)
pp_facet <- crowd %>%
  group_by(participant) %>%
  reframe(crowd_count = seq(min(crowd_count), max(crowd_count), length.out = 60)) %>%
  mutate(
    crowd_count.z = (crowd_count - cc_mean) / cc_sd,
    pid = as.numeric(participant)
  )

# participant-specific fitted curve, back-transformed to expected errors
pp_facet$fit <- to_err(predict(m_count, newdata = pp_facet, type = "response"))

# per-participant observed mean errors in each encounter bin, for reference
pp_bins <- crowd %>%
  group_by(pid, participant, bin) %>%
  summarise(x = mean(crowd_count), avg = mean(n_errors), .groups = "drop")


# ---- facet plot (error scale) --------------------------------------------

p_facet <- ggplot() +

  geom_point(
    data = crowd,
    aes(x = crowd_count, y = n_errors, color = cond),
    position = position_jitter(width = 0.5, height = 0.14, seed = 1),
    alpha = 0.45,
    size = 0.9
  ) +

  geom_point(
    data = pp_bins,
    aes(x = x, y = avg),
    color = "black",
    size = 1.4
  ) +

  geom_line(
    data = pp_facet,
    aes(x = crowd_count, y = fit, group = participant),
    color = "black",
    linewidth = 0.6,
    alpha = 0.85
  ) +

  scale_color_manual(values = zone_cols) +
  scale_y_continuous(breaks = 0:4) +
  scale_x_continuous(breaks = c(0, 10, 20, 27)) +

  facet_wrap(~ pid, ncol = 4) +

  labs(x = "Crowding encounters per trial",
       y = "Errors per trial",
       color = "Interference") +

  my_plot_theme +

  theme(strip.text   = element_text(size = 9),
        axis.text    = element_text(size = 9),
        legend.title = element_text(size = 14, face = "bold"),
        legend.text  = element_text(size = 13),
        legend.key.size = unit(1.2, "lines")) +

  # every trial is inside the panel: nothing is clipped
  coord_cartesian(ylim = c(-0.25, 4.25)) +

  guides(color = guide_legend(override.aes = list(size = 4, alpha = 1)))

p_facet

ggsave("crowding_facet_plot.svg", p_facet, width = 12, height = 12, units = "in")



# individual fits
# m_count has a random intercept only, so every participant is forced onto the slope. 
# fit a random-slope model
# unpooled per-participant GLMs --> show each participant's  slope.


# random-slope-

m_count_rs <- glmer(
  cbind(n_hits, n_errors) ~ crowd_count.z + (1 + crowd_count.z | participant),
  data    = crowd,
  family  = binomial,
  control = glmerControl(optimizer = "bobyqa",
                         optCtrl = list(maxfun = 2e5))
)

summary(m_count_rs)
isSingular(m_count_rs)
anova(m_count, m_count_rs)


# unpooled per-participant fits
ind_fits <- crowd %>%
  group_by(participant) %>%
  group_modify(~ {
    m <- glm(cbind(n_hits, n_errors) ~ crowd_count.z,
             data = .x, family = binomial)
    s <- summary(m)$coefficients
    tibble(b0 = s[1, 1], b1 = s[2, 1], se1 = s[2, 2])
  }) %>%
  ungroup() %>%
  mutate(
    # sign flipped so that POSITIVE = more errors as encounters increase
    err_slope = -b1,
    ci_lower  = err_slope - 1.96 * se1,
    ci_upper  = err_slope + 1.96 * se1
  ) %>%
  arrange(err_slope) %>%
  mutate(rank = row_number())

# n participants show the effect in the predicted direction?
sum(ind_fits$err_slope > 0)   
nrow(ind_fits)

# fitted curve for each pp
pp_ind <- crowd %>%
  group_by(participant) %>%
  reframe(crowd_count = seq(min(crowd_count), max(crowd_count), length.out = 60)) %>%
  mutate(crowd_count.z = (crowd_count - cc_mean) / cc_sd) %>%
  left_join(ind_fits %>% select(participant, b0, b1), by = "participant") %>%
  mutate(fit = to_err(plogis(b0 + b1 * crowd_count.z)))



# individual fitting curves
p_ind <- ggplot() +

  geom_ribbon(
    data = newd,
    aes(x = crowd_count, ymin = lo, ymax = hi),
    fill = "grey60",
    alpha = 0.30
  ) +

  geom_line(
    data = pp_ind,
    aes(x = crowd_count, y = fit, group = participant),
    color = "grey35",
    linewidth = 0.45,
    alpha = 0.75
  ) +

  geom_line(
    data = newd,
    aes(x = crowd_count, y = fit),
    color = "black",
    linewidth = 1.4
  ) +

  scale_x_continuous(breaks = c(0, 10, 20, 27)) +
  scale_y_continuous(breaks = seq(0, 2, by = 0.5)) +

  coord_cartesian(ylim = c(0, 2)) +

  labs(x = "Crowding encounters per trial",
       y = "Errors per trial") +

  my_plot_theme


#participant's slope

p_slopes <- ggplot(ind_fits, aes(x = err_slope, y = rank)) +

  geom_vline(xintercept = 0, linetype = "dashed",
             color = "grey40", linewidth = 0.6) +

  # group-level slope from the random-intercept model, on the error direction
  geom_vline(xintercept = -fixef(m_count)["crowd_count.z"],
             color = "#1a80bb", linewidth = 0.9) +

  geom_errorbarh(aes(xmin = ci_lower, xmax = ci_upper),
                 height = 0, linewidth = 0.6, color = "grey30") +

  geom_point(size = 2, color = "black") +

  scale_y_continuous(breaks = NULL) +

  labs(x = "Slope (log-odds of an error per SD of encounters)",
       y = "Participant (ranked)") +

  my_plot_theme


p_individual <- (p_ind | p_slopes) +
  plot_layout(widths = c(1, 1)) +
  plot_annotation(tag_levels = "A") &
  theme(plot.tag = element_text(size = 16, face = "bold"))

p_individual

ggsave("crowding_individual_fits.svg", p_individual,
       width = 8, height = 4, units = "in")



# errors at specific enounter

pred_at <- function(cc, model = m_count) {
  nd  <- data.frame(crowd_count.z = (cc - cc_mean) / cc_sd)
  X   <- model.matrix(~ crowd_count.z, data = nd)
  eta <- as.vector(X %*% fixef(model))
  se  <- sqrt(diag(X %*% as.matrix(vcov(model)) %*% t(X)))
  data.frame(crowd_count = cc,
             err = to_err(plogis(eta)),
             lo  = to_err(plogis(eta + 1.96 * se)),   # bounds swap
             hi  = to_err(plogis(eta - 1.96 * se)))
}

pred_at(c(0,
          mean(crowd$crowd_count[crowd$cond == "strong"]),
          max(crowd$crowd_count)))
